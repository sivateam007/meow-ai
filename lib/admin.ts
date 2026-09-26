import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { isAdminEmail, isAllowedEmail } from "@/lib/access";

export { isAdminEmail, isAllowedEmail };

export async function isAdmin(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  try {
    const user = await db.appUser.findUnique({ where: { email } });
    return user?.isAdmin === true;
  } catch {
    return false;
  }
}

export async function requireAdmin(
  request: NextRequest,
  opts?: { max?: number; windowMs?: number }
): Promise<{ email: string } | Response> {
  const session = await getSessionUser();
  if (!session?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const admin = await isAdmin(session.email);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const email = session.email;
  if (!rateLimit(`admin:${email.toLowerCase()}`, opts?.max ?? 120, opts?.windowMs)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait and try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }
  return { email };
}
