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

let schemaMigrated = false;

async function runPrismaMigrate() {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const path = await import("path");
  const fs = await import("fs");
  const execAsync = promisify(exec);

  // Find schema.prisma path
  let schemaPath = "./prisma/schema.prisma";
  if (!fs.existsSync(schemaPath)) {
    schemaPath = "./frontend/prisma/schema.prisma";
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), "frontend/prisma/schema.prisma");
    }
  }

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.prisma not found at ${schemaPath} or standard paths`);
  }

  console.log(`[Db Migration] Running prisma migrate deploy with schema path: ${schemaPath}`);
  const { stdout, stderr } = await execAsync(`npx prisma migrate deploy --schema=${schemaPath}`);
  console.log("[Db Migration] Prisma Migrate Output:", stdout);
  if (stderr) {
    console.warn("[Db Migration] Prisma Migrate Warnings:", stderr);
  }
}

async function ensureDatabaseSchema() {
  if (schemaMigrated) return;
  try {
    console.log("[Db Migration] Checking if 'users' table exists...");
    
    // Check if 'users' table exists
    const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = result?.[0]?.exists;
    console.log(`[Db Migration] 'users' table exists: ${usersTableExists}`);
    
    if (!usersTableExists) {
      console.log("[Db Migration] Database is empty or 'users' table is missing. Running prisma migrate deploy...");
      await runPrismaMigrate();
    } else {
      console.log("[Db Migration] Running auto-migration for missing columns on 'users' table...");
      // Add missing columns to users table
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS default_font_family VARCHAR(100) DEFAULT 'TikTokSans-Regular';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS default_font_size INTEGER DEFAULT 24;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS default_font_color VARCHAR(7) DEFAULT '#FFFFFF';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS notify_on_completion BOOLEAN DEFAULT true;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP WITH TIME ZONE;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP WITH TIME ZONE;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;`);
      console.log("[Db Migration] Auto-migration columns verified.");
    }
    
    schemaMigrated = true;
    console.log("[Db Migration] Auto-migration completed successfully.");
  } catch (error) {
    console.error("[Db Migration] Error during raw SQL schema validation:", error);
    try {
      console.log("[Db Migration] Fallback: Running prisma migrate deploy...");
      await runPrismaMigrate();
      schemaMigrated = true;
      console.log("[Db Migration] Fallback prisma migrate deploy completed successfully.");
    } catch (fallbackError) {
      console.error("[Db Migration] Fallback prisma migrate deploy failed:", fallbackError);
      throw new Error(`Database auto-migration failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }
}

// Ensure default admin user exists on startup
export async function ensureAdminUser() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  
  // Run schema migration first before executing any Prisma query on users table
  await ensureDatabaseSchema();

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
    } else {
      console.log(`[Admin Seed] Syncing password and roles for admin user: ${adminEmail}`);
      const { hashPassword } = await import("better-auth/crypto");
      const hashedPassword = await hashPassword("@Arsyamarhan2922");

      // Promosikan user yang sudah ada menjadi admin dan set paket ke scale
      await prisma.user.update({
        where: { id: user.id },
        data: {
          is_admin: true,
          plan: "scale",
        },
      });

      // Update atau buat akun email provider
      const account = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "email" },
      });

      if (account) {
        await prisma.account.update({
          where: { id: account.id },
          data: { password: hashedPassword },
        });
      } else {
        await prisma.account.create({
          data: {
            id: globalThis.crypto.randomUUID(),
            userId: user.id,
            providerId: "email",
            accountId: adminEmail,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      console.log(`[Admin Seed] Admin user ${adminEmail} successfully updated and promoted.`);
    }
  } catch (error) {
    console.error("[Admin Seed] Error ensuring default admin user:", error);
  }
}

export type Session = typeof auth.$Infer.Session;
