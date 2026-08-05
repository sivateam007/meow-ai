import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { email } = await params;

  const conversations = await db.conversation.findMany({
    where: { userEmail: email.toLowerCase() },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { timestamp: "asc" } } },
  });

  const list = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.getTime(),
    updatedAt: c.updatedAt.getTime(),
    messageCount: c.messages.length,
  }));

  return new Response(JSON.stringify(list), {
    headers: { "Content-Type": "application/json" },
  });
}
