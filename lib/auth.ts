import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { isAdminEmail, isAllowedEmail } from "./admin";
import { db } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
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
