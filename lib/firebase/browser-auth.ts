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
  const err = e as { code?: string; message?: string; customData?: { message?: string } };
  const code = err?.code || "";
  const detail = err?.customData?.message || err?.message || "";

  const known: Record<string, string> = {
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups for this site and try again.",
    "auth/unauthorized-domain":
      "This domain is not authorised. Add it under Firebase → Authentication → Settings → Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":
      "Google sign-in is disabled. Enable it under Firebase → Authentication → Sign-in method → Google.",
    "auth/internal-error":
      "Firebase rejected the sign-in. Usually an authorized-domain or API-key restriction problem — check Firebase → Authentication → Settings → Authorized domains.",
    "auth/account-exists-with-different-credential":
      "That account is already linked to a different sign-in method.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      "The Firebase API key is invalid or restricted in Google Cloud Console → APIs & Services → Credentials.",
  };

  if (known[code]) return known[code];

  // Always append the raw code so a misconfiguration is identifiable from the
  // UI alone, without opening developer tools.
  const base = detail || "Sign-in failed.";
  return code ? `${base} (${code})` : base;
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
    const err = e as { code?: string };
    console.error("[auth] firebase sign-in failed", e);
    if (err?.code) console.error("[auth] firebase error code:", err.code);
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
