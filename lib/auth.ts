import { cookies } from "next/headers";
import { db } from "./db";
import { isAdminEmail, isAllowedEmail } from "./access";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "./session";

/**
 * Node-runtime session helpers.
 *
 * `lib/session.ts` holds the edge-safe JWT logic; this file adds the pieces
 * that need the Node runtime or the database:
 *   - reading the session cookie in server components / route handlers
 *   - per-request revocation checks
 *   - the allow-list rules that used to live in the NextAuth `signIn` callback
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
 * Returns true if the user is currently revoked (in the DB). Runs in Node runtime only.
 * Admins (env-based) and users not found in the DB are treated as NOT revoked.
 */
export async function isUserRevoked(email: string): Promise<boolean> {
  try {
    const user = await db.appUser.findUnique({ where: { email: email.toLowerCase() } });
    return user?.status === "revoked";
  } catch {
    return false;
  }
}

export type AuthorizeResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "pending" | "revoked" | "error"; message: string };

/**
 * Applies the invite-only access rules to a freshly verified Google profile.
 *
 * - env-listed admin  -> allow
 * - env-allow-listed  -> allow, and mark the account active
 * - existing active   -> allow, refresh lastSeenAt
 * - existing revoked  -> deny
 * - anything else     -> record a pending request, then deny
 */
export async function authorizeSignIn(profile: SessionUser): Promise<AuthorizeResult> {
  const email = profile.email.toLowerCase();
  const user: SessionUser = { ...profile, email };

  if (isAdminEmail(email)) return { ok: true, user };

  try {
    if (isAllowedEmail(email)) {
      await db.appUser.upsert({
        where: { email },
        update: { lastSeenAt: new Date(), name: user.name || undefined },
        create: {
          email,
          name: user.name,
          status: "active",
          grantedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
      return { ok: true, user };
    }

    const existing = await db.appUser.findUnique({ where: { email } });

    if (existing?.status === "active") {
      await db.appUser.update({
        where: { email },
        data: { lastSeenAt: new Date(), name: user.name || undefined },
      });
      return { ok: true, user };
    }

    if (existing?.status === "revoked") {
      return { ok: false, reason: "revoked", message: "Your access has been revoked." };
    }

    await db.appUser.upsert({
      where: { email },
      update: { status: "pending", name: user.name || undefined },
      create: {
        email,
        name: user.name,
        status: "pending",
        requestedAt: new Date(),
      },
    });

    return {
      ok: false,
      reason: "pending",
      message: "This app is invite-only. An access request has been sent to the admin.",
    };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Could not verify your access right now. Please try again shortly.",
    };
  }
}
