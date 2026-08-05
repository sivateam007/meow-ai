import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!rateLimit(`request-access:${ip}`, 5, 10 * 60 * 1000)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Enter a valid email address" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existing = await db.appUser.findUnique({ where: { email } });
  if (existing?.status === "active") {
    return new Response(JSON.stringify({ error: "Access already granted" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db.appUser.upsert({
    where: { email },
    update: { status: "pending", requestedAt: new Date() },
    create: { email, status: "pending", requestedAt: new Date() },
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
