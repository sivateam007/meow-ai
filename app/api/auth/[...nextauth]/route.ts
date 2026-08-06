import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    return await handlers.GET(request);
  } catch (e) {
    console.error("[auth] GET route error", e);
    throw e;
  }
};

export const POST = async (request: NextRequest) => {
  try {
    return await handlers.POST(request);
  } catch (e) {
    console.error("[auth] POST route error", e);
    throw e;
  }
};
