import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
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
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();

  const conversation = await db.conversation.create({
    data: {
      userEmail: session.user.email,
      title: body.title || "New Chat",
      messages: body.messages
        ? {
            create: body.messages.map((m: { role: string; content: string; timestamp: number; attachments?: unknown }) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              attachments: m.attachments || undefined,
            })),
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
}
