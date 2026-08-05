import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { timestamp: "asc" } } },
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      id: conversation.id,
      title: conversation.title,
      userEmail: conversation.userEmail,
      createdAt: conversation.createdAt.getTime(),
      updatedAt: conversation.updatedAt.getTime(),
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp),
        attachments: m.attachments || undefined,
      })),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
