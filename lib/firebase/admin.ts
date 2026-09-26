import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK (server-side only).
 *
 * Used to verify the ID token that the browser SDK produces after a Google
 * sign-in. Never import this from a client component or from middleware.
 */

let cached: App | null = null;

function getFirebaseAdminApp(): App {
  if (cached) return cached;

  const existing = getApps();
  if (existing.length > 0) {
    cached = existing[0];
    return cached;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Render env vars store the PEM with literal "\n" escapes; restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  cached = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cached;
}

export function firebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export interface VerifiedProfile {
  email: string;
  name: string;
  picture: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedProfile> {
  // checkRevoked is intentionally off: it costs an extra network round-trip per
  // sign-in, and revocation is already enforced against our own AppUser table
  // in authorizeSignIn().
  const decoded = await firebaseAdminAuth().verifyIdToken(idToken);
  if (!decoded.email) {
    throw new Error("Firebase token has no email claim");
  }
  return {
    email: decoded.email.toLowerCase(),
    name: decoded.name || decoded.email,
    picture: decoded.picture || "",
  };
}
