export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|api/auth|api/auth/callback|_next|favicon.ico|cat-bg.png|globals.css).*)"],
};
