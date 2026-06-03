import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { fetchBackend } from "@/server/backend-api";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetchBackend("/tasks/billing/summary", {
      method: "GET",
      userId: session.user.id,
      timeoutMs: 4000, // 4 seconds timeout
      cache: "no-store",
    });
  } catch (err) {
    console.error("[billing-summary] Backend unreachable:", err);
    // Kembalikan struktur default yang aman agar UI tidak crash
    return NextResponse.json({
      monetization_enabled: false,
      plan: "free",
      subscription_status: "inactive",
      usage_count: 0,
      usage_limit: null,
      remaining: null,
      can_create_task: true,
      upgrade_required: false,
      reason: null,
    });
  }

  const responseText = await upstream.text();
  const traceId = upstream.headers.get("x-trace-id");
  return new NextResponse(responseText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      ...(traceId ? { "x-trace-id": traceId } : {}),
    },
  });
}
