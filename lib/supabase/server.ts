import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase server client (Node runtime only).
 *
 * Verifies the access token that the browser obtains from Supabase Auth.
 * Never import this from a client component or from `middleware.ts` — the edge
 * runtime verifies our own `meow_session` JWT with jose instead (lib/session.ts).
 */

let cached: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The service role key is optional. Verifying a token only requires a valid
  // API key, so we fall back to the publishable (anon) key when it is absent.
  // Supplying the service role key additionally unlocks admin operations.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}

export interface VerifiedProfile {
  email: string;
  name: string;
  picture: string;
}

/** Reads a string field out of user_metadata, falling back when absent. */
function metaString(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" && value.length > 0 ? value : "";
}

export async function verifySupabaseAccessToken(accessToken: string): Promise<VerifiedProfile> {
  const { data, error } = await getServerClient().auth.getUser(accessToken);

  if (error || !data?.user) {
    throw new Error(error?.message || "Supabase rejected the access token");
  }

  const email = data.user.email;
  if (!email) {
    throw new Error("Supabase user has no email claim");
  }

  // Supabase records social-profile fields in user_metadata. Email/password
  // users simply have none, so every field falls back cleanly.
  const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
  const name = metaString(meta, "full_name") || metaString(meta, "name") || email;
  const picture = metaString(meta, "avatar_url") || metaString(meta, "picture");

  return { email: email.toLowerCase(), name, picture };
}
