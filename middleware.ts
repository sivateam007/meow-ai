import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const middleware = NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!login|access-denied|api/auth|api/auth/callback|api/request-access|_next|favicon.ico|cat-bg.png|globals.css).*)"],
};
