import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildBackendAuthHeaders } from "@/lib/backend-auth";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl}/tasks/billing/summary`, {
      method: "GET",
      headers: buildBackendAuthHeaders(session.user.id),
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
