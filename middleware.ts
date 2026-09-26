import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Edge middleware.
 *
 * The session cookie is a self-contained JWT signed with SESSION_SECRET, so it
 * can be verified here without Prisma or the Firebase Admin SDK (neither runs
 * on the edge). This is a fast first line of defence only — every API route
 * re-checks the session and revocation status server-side.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (user) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|access-denied|api/auth|api/request-access|\.well-known|manifest\.webmanifest|icons|_next|favicon.ico|cat-bg\.png|globals\.css).*)"],
};
