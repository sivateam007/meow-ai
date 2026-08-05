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

      if (isAdminEmail(email)) return true;

      if (isAllowedEmail(email)) {
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
        return true;
      }

      const existing = await db.appUser.findUnique({ where: { email } });

      if (existing?.status === "active") {
        await db.appUser.update({
          where: { email },
          data: { lastSeenAt: new Date(), name: user.name ?? undefined },
        });
        return true;
      }

      return false;
    },
  },
});
