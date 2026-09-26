"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client (client-side only).
 *
 * Used solely to obtain an access token from Supabase Auth. The browser never
 * talks to the database directly — every read and write goes through our own
 * API routes, and access is enforced by the httpOnly `meow_session` cookie.
 *
 * The anon/publishable key is designed to be public, so exposing it here is
 * safe. All authority lives in the server-side allow-list, not in this key.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cached = createClient(url, anonKey, {
    auth: {
      // Google sign-in returns to us with tokens in the URL, so the client must
      // read them on load. We exchange them for our own httpOnly cookie
      // immediately and then discard them, so there is nothing to persist or
      // refresh on the client.
      detectSessionInUrl: true,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
