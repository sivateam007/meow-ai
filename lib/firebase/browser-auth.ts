"use client";

import {
  GoogleAuthProvider,
  getAuth,
  signInWithCredential,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseApp } from "./client";

/**
 * Shared sign-in flow for the login and access-denied pages.
 *
 * Web: Firebase opens the Google popup and mints an ID token.
 * Native (Capacitor): the GoogleAuth plugin already produced a Google ID token,
 * so we wrap it in a Firebase credential instead of opening a popup.
 *
 * Either way the resulting Firebase ID token is POSTed to /api/auth/session,
 * which verifies it server-side, applies the allow-list rules and sets the
 * session cookie.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: {
        GoogleAuth?: {
          signIn: () => Promise<{ idToken: string }>;
        };
      };
    };
  }
}

export type SignInOutcome =
  | { ok: true }
  | { ok: false; reason: "pending" | "revoked"; message: string }
  | { ok: false; reason: "error"; message: string };

function friendlyFirebaseError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in popup.";
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorised for sign-in. Add it under Authentication → Settings → Authorized domains.";
  }
  if (code === "auth/network-request-failed") return "Network error. Check your connection.";
  if (code === "auth/account-exists-with-different-credential") {
    return "That account is already linked to a different sign-in method.";
  }
  return (e as Error)?.message || "Sign-in failed. Please try again.";
}

async function getCredential(): Promise<UserCredential> {
  const auth = getAuth(getFirebaseApp());
  const provider = new GoogleAuthProvider();

  if (window.Capacitor?.isNativePlatform() === true) {
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (!GoogleAuth) {
      throw new Error("Google sign-in is not available in this app build.");
    }
    const result = await GoogleAuth.signIn();
    if (!result?.idToken) {
      throw new Error("Google sign-in did not return an ID token.");
    }
    return signInWithCredential(auth, GoogleAuthProvider.credential(result.idToken));
  }

  return signInWithPopup(auth, provider);
}

export async function signInWithGoogle(): Promise<SignInOutcome> {
  let idToken: string;
  try {
    const credential = await getCredential();
    idToken = await credential.user.getIdToken();
  } catch (e) {
    return { ok: false, reason: "error", message: friendlyFirebaseError(e) };
  }

  let response: Response;
  try {
    response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    return { ok: false, reason: "error", message: "Could not reach the server. Please try again." };
  }

  const data = (await response.json().catch(() => ({}))) as {
    user?: unknown;
    reason?: string;
    error?: string;
  };

  if (response.ok) return { ok: true };

  if (response.status === 403) {
    if (data?.reason === "revoked") {
      return { ok: false, reason: "revoked", message: "Your access has been revoked." };
    }
    if (data?.reason === "pending") {
      return { ok: false, reason: "pending", message: "An access request has been sent to the admin." };
    }
  }

  return {
    ok: false,
    reason: "error",
    message: data?.error || "Sign-in failed. Please try again.",
  };
}
