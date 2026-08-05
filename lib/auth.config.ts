import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
