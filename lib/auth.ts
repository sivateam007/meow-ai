import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
    signIn({ user }) {
      const allowed = process.env.MEOW_AI_ALLOWED_EMAILS;
      if (!allowed || !user.email) return true;
      return allowed
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .includes(user.email.toLowerCase());
    },
  },
  trustHost: true,
});
