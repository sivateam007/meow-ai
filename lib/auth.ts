import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "./session";

/**
 * Node-runtime session helpers.
 *
 * `lib/session.ts` holds the edge-safe JWT logic; this file adds the pieces
 * that need the Node runtime or the database:
 *   - reading the session cookie in server components / route handlers
 *   - per-request revocation checks
 *
 * Sign-in itself needs no database: it proves knowledge of a single shared
 * secret (see `lib/credentials.ts`) and returns a cookie.
 */

export type { SessionUser };

/** Reads and verifies the session cookie. Returns null when not signed in. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Returns true if the owner has been revoked in the DB. Runs in Node runtime
 * only. A missing row and any database error both count as "not revoked", so a
 * paused database never locks the owner out of their own app.
 */
export async function isUserRevoked(email: string): Promise<boolean> {
  try {
    const user = await db.appUser.findUnique({ where: { email: email.toLowerCase() } });
    return user?.status === "revoked";
  } catch {
    return false;
  }
}
