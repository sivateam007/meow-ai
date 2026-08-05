import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const admin = await requireAdmin(request, { max: 30 });
  if (admin instanceof Response) return admin;

  const { email } = await params;
  const target = email.toLowerCase();

  const user = await db.appUser.findUnique({ where: { email: target } });
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { status?: string; isAdmin?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data: { status?: string; isAdmin?: boolean; grantedAt?: Date | null } = {};

  if (body.status === "active" || body.status === "revoked" || body.status === "pending") {
    data.status = body.status;
    data.grantedAt = body.status === "active" ? new Date() : user.grantedAt;
  }
  if (typeof body.isAdmin === "boolean") {
    data.isAdmin = body.isAdmin;
  }

  const updated = await db.appUser.update({ where: { email: target }, data });

  return new Response(JSON.stringify({ ok: true, status: updated.status, isAdmin: updated.isAdmin }), {
    headers: { "Content-Type": "application/json" },
  });
}
