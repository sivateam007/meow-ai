import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = await params;
  const conversation = await db.conversation.findFirst({
    where: { id, userEmail: session.user.email },
    include: { messages: { orderBy: { timestamp: "asc" } } },
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  return new Response(JSON.stringify({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.getTime(),
    updatedAt: conversation.updatedAt.getTime(),
    messages: conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: Number(m.timestamp),
      attachments: m.attachments || undefined,
    })),
  }));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await db.conversation.findFirst({
    where: { id, userEmail: session.user.email },
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  if (body.messages) {
    await db.message.deleteMany({ where: { conversationId: id } });
    await db.message.createMany({
      data: body.messages.map((m: { role: string; content: string; timestamp: number; attachments?: unknown }) => ({
        conversationId: id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        attachments: m.attachments || undefined,
      })),
    });
  }

  const updated = await db.conversation.update({
    where: { id },
    data: {
      title: body.title,
      updatedAt: new Date(),
    },
    include: { messages: { orderBy: { timestamp: "asc" } } },
  });

  return new Response(JSON.stringify({
    id: updated.id,
    title: updated.title,
    createdAt: updated.createdAt.getTime(),
    updatedAt: updated.updatedAt.getTime(),
    messages: updated.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: Number(m.timestamp),
      attachments: m.attachments || undefined,
    })),
  }));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = await params;
  const existing = await db.conversation.findFirst({
    where: { id, userEmail: session.user.email },
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  await db.conversation.delete({ where: { id } });

  return new Response(JSON.stringify({ ok: true }));
}
