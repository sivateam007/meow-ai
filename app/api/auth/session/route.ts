import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { authorizeSignIn, getSessionUser } from "@/lib/auth";
import { verifySupabaseAccessToken } from "@/lib/supabase/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";

/**
 * Replaces the former NextAuth handler.
 *
 * POST   — client sends a Supabase access token, we verify it, apply the
 *          invite-only rules and set the session cookie.
 * GET    — returns the current user (used by the client auth provider).
 * DELETE — clears the session cookie.
 */

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!rateLimit(`session:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  let body: { accessToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body?.accessToken || typeof body.accessToken !== "string") {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  let profile: { email: string; name: string; picture: string };
  try {
    profile = await verifySupabaseAccessToken(body.accessToken);
  } catch (e) {
    console.error("[auth] access token verification failed", e);
    return NextResponse.json({ error: "Sign-in could not be verified. Please try again." }, { status: 401 });
  }

  const result = await authorizeSignIn({
    email: profile.email,
    name: profile.name,
    image: profile.picture,
  });

  if (!result.ok) {
    // "error" here means the allow-list lookup itself failed (e.g. the database
    // is unreachable). That is a temporary service problem, not a refusal, so
    // it must not send the user to the access-denied page.
    const status = result.reason === "error" ? 503 : 403;
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status }
    );
  }

  let token: string;
  try {
    token = await createSessionToken(result.user);
  } catch (e) {
    console.error("[auth] could not sign session token", e);
    return NextResponse.json({ error: "Sign-in is not configured correctly." }, { status: 500 });
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
