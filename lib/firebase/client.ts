"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

/**
 * Firebase Web SDK (client-side only).
 *
 * Only used to obtain a Google ID token. The client never talks to Firestore or
 * any other Firebase backend — all data access goes through our own API routes
 * using the Admin SDK, and security comes from server-side token verification.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(config);
}
