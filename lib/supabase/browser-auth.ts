"use client";

import { getSupabaseClient } from "./client";

/**
 * Sign-in flows, shared by the login and access-denied pages.
 *
 * Two providers are supported:
 *
 *   Password — Supabase Auth exchanges email + password for an access token.
 *   Google   — the browser is redirected to Google and back. The return trip
 *              lands on the page with tokens in the URL, which
 *              `completeGoogleRedirect()` picks up and exchanges.
 *
 * Either way the access token is POSTed to /api/auth/session, which verifies
 * it, applies the invite-only rules and sets the httpOnly session cookie.
 */

export type SignInOutcome =
  | { ok: true }
  | { ok: false; reason: "pending" | "revoked"; message: string }
  | { ok: false; reason: "error"; message: string };

function friendlySupabaseError(message: string): string {
  const text = message || "";

  if (/invalid login credentials/i.test(text)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(text)) {
    return "Confirm your email address, then sign in again.";
  }
  if (/email.*invalid|invalid email/i.test(text)) {
    return "That does not look like a valid email address.";
  }
  if (/already registered|already exists/i.test(text)) {
    return "That email already has an account. Sign in instead.";
  }
  if (/password should be at least/i.test(text)) {
    return "Password must be at least 6 characters.";
  }
  if (/rate limit|too many|security purposes/i.test(text)) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (/fetch|network|failed to fetch/i.test(text)) {
    return "Network error. Check your connection and try again.";
  }
  if (/popup|window\.opener|cross-origin/i.test(text)) {
    return "Could not open the Google sign-in window. Allow popups for this site and try again.";
  }

  // Always surface the raw message so a misconfiguration is identifiable from
  // the UI alone, without opening developer tools.
  return text || "Sign-in failed.";
}

/** Swaps a Supabase access token for our own session cookie. */
async function exchangeAccessToken(accessToken: string): Promise<SignInOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
  } catch {
    return { ok: false, reason: "error", message: "Could not reach the server. Please try again." };
  }

  const data = (await response.json().catch(() => ({}))) as {
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

export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInOutcome> {
  let accessToken: string;

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { ok: false, reason: "error", message: friendlySupabaseError(error.message) };
    }

    const token = data.session?.access_token;
    if (!token) {
      return {
        ok: false,
        reason: "error",
        message: "Supabase did not return an access token.",
      };
    }
    accessToken = token;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-in failed.";
    console.error("[auth] supabase sign-in failed", e);
    return { ok: false, reason: "error", message: friendlySupabaseError(message) };
  }

  return exchangeAccessToken(accessToken);
}

/**
 * Hands the browser to Google. On success the page navigates away, so this
 * never resolves on the happy path.
 */
export async function startGoogleSignIn(): Promise<SignInOutcome> {
  try {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, scopes: "openid email profile" },
    });

    if (error) {
      return { ok: false, reason: "error", message: friendlySupabaseError(error.message) };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google sign-in failed.";
    console.error("[auth] google sign-in failed", e);
    return { ok: false, reason: "error", message: friendlySupabaseError(message) };
  }
}

/**
 * Finishes a Google sign-in after the browser returns to /login.
 *
 * Returns null when the page was not reached via a Google redirect, so the
 * caller can leave the form alone.
 */
export async function completeGoogleRedirect(): Promise<SignInOutcome | null> {
  let accessToken: string | undefined;

  try {
    const { data } = await getSupabaseClient().auth.getSession();
    accessToken = data.session?.access_token;
  } catch (e) {
    console.error("[auth] could not read the google callback", e);
    return null;
  }

  if (!accessToken) return null;

  return exchangeAccessToken(accessToken);
}
