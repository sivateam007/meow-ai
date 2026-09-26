import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session handling.
 *
 * This module is imported by `middleware.ts`, which runs on the edge runtime.
 * It therefore must NOT import Prisma, `@supabase/supabase-js`, or anything
 * Node-only. The only dependency is `jose`, which is Web Crypto based.
 *
 * The session cookie is a self-contained HS256 JWT. Middleware can verify the
 * signature without touching the database, which keeps route protection working
 * on the edge. Revocation is still enforced per-request in the Node routes via
 * `isUserRevoked()` in `lib/auth.ts`.
 */

export const SESSION_COOKIE = "meow_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  email: string;
  name: string;
  image: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short (need 32+ characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, image: user.image })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      email: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "",
      image: typeof payload.image === "string" ? payload.image : "",
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
} as const;
