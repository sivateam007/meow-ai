import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginIdentity, verifyLoginSecret } from "@/lib/credentials";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";

/**
 * Replaces the former NextAuth and Supabase Auth handlers.
 *
 * POST   — client submits the single shared secret; we set the session cookie.
 * GET    — returns the current user (used by the client auth provider).
 * DELETE — clears the session cookie.
 *
 * There is no third-party identity provider any more. The app is used by one
 * person, so sign-in proves knowledge of one secret rather than a token
 * minted by an external service. This also means signing in no longer needs a
 * network round-trip: a paused or unreachable database can never lock the
 * owner out of the login page.
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

  // Brute-force guard. 20 guesses per 10 minutes per IP is generous for a
  // human and hopeless for an attacker working through a passphrase.
  if (!rateLimit(`session:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait and try again." },
      { status: 429 }
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const check = verifyLoginSecret(body?.password);

  if (!check.ok && check.reason === "unconfigured") {
    // Not the user's fault — the server has no usable secret at all.
    return NextResponse.json(
      { error: "Sign-in is not configured yet. Please contact support." },
      { status: 503 }
    );
  }

  if (!check.ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  let token: string;
  try {
    token = await createSessionToken(loginIdentity());
  } catch (e) {
    console.error("[auth] could not sign session token", e);
    return NextResponse.json({ error: "Sign-in is not configured correctly." }, { status: 500 });
  }

  // Record the owner so the /admin screen has a row to show. This is a
  // convenience only: a database outage must never block the sign-in itself,
  // so any failure here is swallowed and the cookie is still set.
  try {
    const identity = loginIdentity();
    await db.appUser.upsert({
      where: { email: identity.email },
      update: { lastSeenAt: new Date(), name: identity.name, status: "active" },
      create: {
        email: identity.email,
        name: identity.name,
        status: "active",
        grantedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[auth] could not refresh the profile row", e);
  }

  const response = NextResponse.json({ user: loginIdentity() });
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
