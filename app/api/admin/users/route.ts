import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const [appUsers, stats] = await Promise.all([
    db.appUser.findMany({ orderBy: { createdAt: "desc" } }),
    db.conversation.groupBy({
      by: ["userEmail"],
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
  ]);

  const statMap = new Map(stats.map((s) => [s.userEmail, s]));

  const users = appUsers.map((u) => {
    const stat = statMap.get(u.email);
    return {
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      status: u.status,
      requestedAt: u.requestedAt?.getTime() ?? null,
      grantedAt: u.grantedAt?.getTime() ?? null,
      lastSeenAt: u.lastSeenAt?.getTime() ?? null,
      createdAt: u.createdAt.getTime(),
      conversationCount: stat?._count._all ?? 0,
      lastActivity: stat?._max.updatedAt?.getTime() ?? null,
    };
  });

  return new Response(JSON.stringify(users), {
    headers: { "Content-Type": "application/json" },
  });
}
