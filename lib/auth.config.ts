import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    async authorized({ auth }) {
      if (!auth?.user?.email) return false;
      const { db } = await import("@/lib/db");
      const user = await db.appUser.findUnique({ where: { email: auth.user.email } });
      if (user?.status === "revoked") return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
