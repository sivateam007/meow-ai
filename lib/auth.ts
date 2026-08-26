import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { isAdminEmail, isAllowedEmail } from "./admin";
import { db } from "./db";

async function verifyGoogleIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
} | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const expectedAud = process.env.AUTH_GOOGLE_ID;
    if (expectedAud && payload.aud !== expectedAud) return null;
    if (!payload.email || payload.email_verified !== "true") return null;
    return {
      email: payload.email as string,
      name: (payload.name as string) || (payload.email as string),
      picture: (payload.picture as string) || "",
      emailVerified: true,
    };
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      id: "google-native",
      name: "Google (Native)",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (!idToken || typeof idToken !== "string") return null;
        const profile = await verifyGoogleIdToken(idToken);
        if (!profile) return null;
        return {
          id: profile.email,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365,
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      console.log(
        "[auth] signIn email=",
        email,
        "adminEnv=",
        process.env.MEOW_AI_ADMIN_EMAILS ? "set" : "MISSING",
        "allowedEnv=",
        process.env.MEOW_AI_ALLOWED_EMAILS ? "set" : "MISSING"
      );

      if (isAdminEmail(email)) return true;

      if (isAllowedEmail(email)) {
        try {
          await db.appUser.upsert({
            where: { email },
            update: { lastSeenAt: new Date(), name: user.name ?? undefined },
            create: {
              email,
              name: user.name,
              status: "active",
              grantedAt: new Date(),
              lastSeenAt: new Date(),
            },
          });
        } catch (e) {
          console.error("[auth] upsert failed for", email, e);
          return false;
        }
        return true;
      }

      try {
        const existing = await db.appUser.findUnique({ where: { email } });
        console.log(
          "[auth] signIn db result for",
          email,
          existing ? `status=${existing.status}` : "NOT_FOUND"
        );
        if (existing?.status === "active") {
          await db.appUser.update({
            where: { email },
            data: { lastSeenAt: new Date(), name: user.name ?? undefined },
          });
          return true;
        }

        if (existing?.status === "revoked") {
          return false;
        }

        await db.appUser.upsert({
          where: { email },
          update: { status: "pending", name: user.name ?? undefined },
          create: {
            email,
            name: user.name,
            status: "pending",
            requestedAt: new Date(),
          },
        });
        console.log("[auth] auto-requested pending access for", email);
      } catch (e) {
        console.error("[auth] signIn db error for", email, e);
        return false;
      }

      return false;
    },
  },
});
