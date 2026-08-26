import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_ROLES = new Set(["user", "assistant"]);
const MAX_TITLE = 200;
const MAX_MESSAGES = 200;
const MAX_CONTENT = 50000;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const conversations = await db.conversation.findMany({
      where: { userEmail: session.user.email },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { timestamp: "asc" } } },
    });

    const formatted = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.getTime(),
      updatedAt: c.updatedAt.getTime(),
      messages: c.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp),
        attachments: m.attachments || undefined,
      })),
    }));

    return new Response(JSON.stringify(formatted));
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let body: { title?: string; messages?: unknown[] };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.substring(0, MAX_TITLE) || "New Chat" : "New Chat";

    let messagesData: unknown[] | undefined;
    if (Array.isArray(body.messages)) {
      if (body.messages.length > MAX_MESSAGES) {
        return new Response(JSON.stringify({ error: "Too many messages" }), { status: 400 });
      }
      messagesData = body.messages.map((m: Record<string, unknown>) => ({
        role: VALID_ROLES.has(m.role as string) ? m.role : "user",
        content: typeof m.content === "string" ? m.content.substring(0, MAX_CONTENT) : "",
        timestamp: typeof m.timestamp === "number" ? m.timestamp : Date.now(),
        attachments: m.attachments || undefined,
      }));
    }

    const conversation = await db.conversation.create({
      data: {
        userEmail: session.user.email,
        title,
        messages: messagesData
          ? {
              create: messagesData as { role: string; content: string; timestamp: number; attachments?: unknown }[],
            }
          : undefined,
      },
      include: { messages: true },
    });

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
