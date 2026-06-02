import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdmin = Boolean((session.user as { is_admin?: boolean }).is_admin);

  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }

    const { id } = await params;
    const body = await request.json();
    const { plan } = body as { plan?: string };

    if (!plan || !["free", "pro", "scale"].includes(plan)) {
      return NextResponse.json({ error: "Plan tidak valid" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        plan,
        subscription_status: plan === "free" ? "inactive" : "active",
        // Clear stripe fields if downgraded to free manually
        ...(plan === "free" ? {
          stripe_subscription_id: null,
          billing_period_start: null,
          billing_period_end: null
        } : {})
      },
      select: {
        id: true,
        email: true,
        plan: true,
        subscription_status: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Failed to update user plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
