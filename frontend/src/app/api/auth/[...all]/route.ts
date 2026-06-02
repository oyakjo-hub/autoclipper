import { auth, ensureAdminUser } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth.handler);

export async function GET(request: NextRequest) {
  await ensureAdminUser();
  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  await ensureAdminUser();
  return handler.POST(request);
}
