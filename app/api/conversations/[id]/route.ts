import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = new Set(["user", "assistant"]);
const MAX_TITLE = 200;
const MAX_MESSAGES = 200;
const MAX_CONTENT = 50000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { id } = await params;

    let body: { title?: string; messages?: unknown[] };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
    }

    const existing = await db.conversation.findFirst({
      where: { id, userEmail: session.user.email },
    });

    if (!existing) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    if (Array.isArray(body.messages)) {
      if (body.messages.length > MAX_MESSAGES) {
        return new Response(JSON.stringify({ error: "Too many messages" }), { status: 400 });
      }
      const validated = (body.messages as Record<string, unknown>[]).map((m) => ({
        conversationId: id,
        role: VALID_ROLES.has(m.role as string) ? m.role : "user",
        content: typeof m.content === "string" ? m.content.substring(0, MAX_CONTENT) : "",
        timestamp: typeof m.timestamp === "number" ? m.timestamp : Date.now(),
        attachments: m.attachments || undefined,
      }));
      await db.$transaction([
        db.message.deleteMany({ where: { conversationId: id } }),
        db.message.createMany({ data: validated }),
      ]);
    }

    const title = typeof body.title === "string" ? body.title.substring(0, MAX_TITLE) : existing.title;

    const updated = await db.conversation.update({
      where: { id },
      data: {
        title,
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
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
