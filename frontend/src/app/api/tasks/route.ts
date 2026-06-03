import { NextResponse } from "next/server";

import { createProxyResponse, fetchBackend } from "@/server/backend-api";
import { getServerSession } from "@/server/session";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetchBackend("/tasks/", {
      method: "GET",
      userId: session.user.id,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[tasks GET] Backend unreachable:", err);
    return NextResponse.json(
      { error: "Backend sedang tidak tersedia. Silakan coba lagi nanti.", code: "BACKEND_UNAVAILABLE" },
      { status: 503 }
    );
  }

  return createProxyResponse(upstream);
}
