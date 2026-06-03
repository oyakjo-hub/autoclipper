import { NextResponse } from "next/server";

import { createTextProxyResponse, fetchBackend } from "@/server/backend-api";
import { getServerSession } from "@/server/session";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdmin = Boolean((session.user as { is_admin?: boolean }).is_admin);
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  let upstream: Response;
  try {
    upstream = await fetchBackend("/admin/runtime-settings", {
      method: "GET",
      userId: adminCheck.session.user.id,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[runtime-settings GET] Backend unreachable:", err);
    return NextResponse.json(
      { error: "Backend sedang tidak tersedia. Silakan coba lagi nanti.", code: "BACKEND_UNAVAILABLE" },
      { status: 503 }
    );
  }

  return createTextProxyResponse(upstream);
}

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetchBackend("/admin/runtime-settings", {
      method: "PATCH",
      userId: adminCheck.session.user.id,
      extraHeaders: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[runtime-settings PATCH] Backend unreachable:", err);
    return NextResponse.json(
      { error: "Backend sedang tidak tersedia. Silakan coba lagi nanti.", code: "BACKEND_UNAVAILABLE" },
      { status: 503 }
    );
  }

  return createTextProxyResponse(upstream);
}
