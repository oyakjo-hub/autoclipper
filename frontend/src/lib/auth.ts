import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../generated/prisma";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient();
const disableSignUp = ["1", "true", "yes"].includes(
  (process.env.DISABLE_SIGN_UP ?? "").toLowerCase()
);

function toOrigin(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const trustedOrigins = Array.from(
  new Set(
    [
      toOrigin(process.env.NEXT_PUBLIC_APP_URL),
      toOrigin(process.env.BETTER_AUTH_URL),
      "http://localhost:3107",
      "http://sp.localhost:3107",
      "http://supoclip.localhost:3107",
    ].filter((origin): origin is string => Boolean(origin))
  )
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      is_admin: {
        type: "boolean",
        input: false,
      },
    },
  },
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp,
  },
  plugins: [
    nextCookies(), // Enable Next.js cookie handling
  ],
});

// Ensure default admin user exists on startup
async function ensureAdminUser() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  try {
    const adminEmail = "oyakjo@gmail.com";
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      console.log(`[Admin Seed] Creating default admin user: ${adminEmail}`);
      await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: "@Arsyamarhan2922",
          name: "Admin Oyak",
        },
      });
      
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          is_admin: true,
          plan: "scale",
        },
      });
      console.log(`[Admin Seed] Admin user ${adminEmail} created and promoted to admin.`);
    } else if (!user.is_admin) {
      console.log(`[Admin Seed] Promoting existing user ${adminEmail} to admin.`);
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          is_admin: true,
          plan: "scale",
        },
      });
    }
  } catch (error) {
    console.error("[Admin Seed] Error ensuring default admin user:", error);
  }
}

if (typeof window === "undefined") {
  ensureAdminUser();
}

export type Session = typeof auth.$Infer.Session;
