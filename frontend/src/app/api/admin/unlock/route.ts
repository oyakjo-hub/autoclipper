import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Password admin dibaca dari environment variable untuk keamanan
// Fallback ke password default jika env tidak diset
const ADMIN_PASSWORD =
  process.env.ADMIN_UNLOCK_PASSWORD ||
  process.env.BETTER_AUTH_SECRET?.slice(0, 16) ||
  "@Arsyamarhan2922";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password diperlukan" }, { status: 400 });
    }

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set("admin_unlocked", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 jam (lebih aman dari 24 jam)
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Password admin tidak valid!" }, { status: 401 });
  } catch (error) {
    console.error("Unlock error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
