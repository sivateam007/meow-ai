import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  return new Response(JSON.stringify({ isAdmin: !(admin instanceof Response) }), {
    headers: { "Content-Type": "application/json" },
  });
}
