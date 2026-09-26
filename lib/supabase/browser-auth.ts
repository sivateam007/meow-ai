"use client";

import { getSupabaseClient } from "./client";

/**
 * Shared sign-in flow for the login and access-denied pages.
 *
 * Supabase Auth exchanges the email + password for an access token, which is
 * then POSTed to /api/auth/session. That route verifies the token, applies the
 * invite-only rules and sets the httpOnly session cookie.
 *
 * Supabase (rather than a third-party provider) also means there is no OAuth
 * client, authorized-domain list or test-user list to configure: one service,
 * not two.
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

  // Always surface the raw message so a misconfiguration is identifiable from
  // the UI alone, without opening developer tools.
  return text || "Sign-in failed.";
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
