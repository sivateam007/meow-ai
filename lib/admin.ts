import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export function isAdminEmail(email: string): boolean {
  const admins = process.env.MEOW_AI_ADMIN_EMAILS;
  if (!admins) return false;
  return admins
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export function isAllowedEmail(email: string): boolean {
  const allowed = process.env.MEOW_AI_ALLOWED_EMAILS;
  if (!allowed) return false;
  return allowed
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

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
  request: NextRequest
): Promise<{ email: string } | Response> {
  const session = await auth();
  if (!session?.user?.email) {
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
  const admin = await isAdmin(session.user.email);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { email: session.user.email };
}
