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
    upstream = await fetchBackend("/fonts", {
      method: "GET",
      userId: session.user.id,
      timeoutMs: 4000,
      cache: "no-store",
    });

    if (upstream.status === 404) {
      upstream = await fetchBackend("/api/fonts", {
        method: "GET",
        userId: session.user.id,
        timeoutMs: 4000,
        cache: "no-store",
      });
    }
  } catch (err) {
    console.error("[fonts] Backend unreachable:", err);
    return NextResponse.json({
      fonts: [
        { name: "TikTokSans-Regular", display_name: "TikTok Sans Regular" }
      ]
    });
  }

  const responseText = await upstream.text();
  return new NextResponse(responseText, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
