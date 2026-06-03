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
      "http://localhost:3000",
      "http://localhost:3107",
      "http://sp.localhost:3000",
      "http://sp.localhost:3107",
      "http://supoclip.localhost:3000",
      "http://supoclip.localhost:3107",
    ].filter((origin): origin is string => Boolean(origin))
  )
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET || "dummy_secret_for_build_time_only_1234567890",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  user: {
    additionalFields: {
      is_admin: {
        type: "boolean",
        input: false,
      },
      plan: {
        type: "string",
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

// Flag per-process agar skema DB dan admin seed hanya dijalankan sekali
let schemaMigrated = false;
let adminSeeded = false;


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
    console.log("[Db Migration] Ensuring all tables exist (self-healing raw SQL)...");
    
    // 1. Ensure all core tables exist (run in dependency order)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        image VARCHAR(500),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sources" (
        id TEXT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        url VARCHAR(1000),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
        source_id TEXT REFERENCES "sources"(id) ON DELETE SET NULL,
        generated_clips_ids TEXT[],
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        progress_message TEXT,
        font_family VARCHAR(100) DEFAULT 'TikTokSans-Regular',
        font_size INTEGER DEFAULT 24,
        font_color VARCHAR(7) DEFAULT '#FFFFFF',
        caption_template VARCHAR(50) DEFAULT 'default',
        include_broll BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completion_notification_sent_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ipAddress" VARCHAR(255),
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE,
        "updatedAt" TIMESTAMP WITH TIME ZONE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
        id TEXT PRIMARY KEY,
        type VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        setting_key VARCHAR(100) PRIMARY KEY,
        encrypted_value TEXT NOT NULL,
        prefer_admin_value BOOLEAN NOT NULL DEFAULT false,
        updated_by TEXT REFERENCES "users"(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("[Db Migration] Ensuring all columns on 'users' table exist...");
    
    // 2. Add missing columns to users table
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
// Hanya dijalankan satu kali per-process untuk performa optimal
export async function ensureAdminUser() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  // Jika sudah di-seed di process ini, lewati
  if (adminSeeded) {
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
      const { hashPassword } = await import("better-auth/crypto");
      const hashedPassword = await hashPassword("@Arsyamarhan2922");
      const adminUserId = globalThis.crypto.randomUUID();

      await prisma.user.create({
        data: {
          id: adminUserId,
          email: adminEmail,
          name: "Admin Oyak",
          emailVerified: true,
          is_admin: true,
          plan: "scale",
        },
      });

      await prisma.account.create({
        data: {
          id: globalThis.crypto.randomUUID(),
          userId: adminUserId,
          providerId: "credential",
          accountId: adminEmail,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`[Admin Seed] Admin user ${adminEmail} created directly via database.`);
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

      // Bersihkan akun duplikat usang dengan providerId "email" (dari bug sebelumnya)
      await prisma.account.deleteMany({
        where: { userId: user.id, providerId: "email" },
      });

      // Update atau buat akun credential provider
      // better-auth menggunakan providerId "credential" untuk autentikasi email+password
      const account = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      if (account) {
        await prisma.account.update({
          where: { id: account.id },
          data: { password: hashedPassword },
        });
        console.log(`[Admin Seed] Updated password for credential account (id: ${account.id}).`);
      } else {
        await prisma.account.create({
          data: {
            id: globalThis.crypto.randomUUID(),
            userId: user.id,
            providerId: "credential",
            accountId: adminEmail,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log(`[Admin Seed] Created new credential account for admin.`);
      }
      console.log(`[Admin Seed] Admin user ${adminEmail} successfully updated and promoted.`);
    }
    // Tandai sudah selesai sehingga tidak dijalankan lagi di process ini
    adminSeeded = true;
  } catch (error) {
    console.error("[Admin Seed] Error ensuring default admin user:", error);
    // Jangan set adminSeeded = true saat error, agar retry bisa terjadi
  }
}

export type Session = typeof auth.$Infer.Session;
