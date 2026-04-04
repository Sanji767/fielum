import dotenv from "dotenv";
import path from "path";
// Load .env.local variables explicitly in CLI context
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createAdminClient } from "../src/lib/supabase/admin";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@fielum.com";
const ADMIN_PASSWORD = "Password123!"; // Default development password

async function main() {
  console.log("🚀 Creating development admin user in Supabase Auth and linking to Postgres...");

  const supabaseAdmin = createAdminClient();

  // 1. Check if user already exists in Supabase Auth
  let authUserId: string | null = null;
  
  console.log(`Checking if user ${ADMIN_EMAIL} exists in Supabase Auth...`);
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    throw new Error(`Failed to list Supabase users: ${listError.message}`);
  }

  const existingAuthUser = listData.users.find(u => u.email === ADMIN_EMAIL);

  if (existingAuthUser) {
    console.log(`User ${ADMIN_EMAIL} already exists in Supabase Auth with ID: ${existingAuthUser.id}`);
    authUserId = existingAuthUser.id;
    // Update password to ensure it matches
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: ADMIN_PASSWORD,
    });
  } else {
    // Create new user in Supabase Auth
    console.log(`Creating user ${ADMIN_EMAIL} in Supabase Auth...`);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: "Mark (Super Admin)",
      }
    });

    if (createError) {
      throw new Error(`Failed to create Supabase auth user: ${createError.message}`);
    }

    if (!createData.user) {
      throw new Error("Failed to retrieve created Supabase auth user data.");
    }

    console.log(`Successfully created user in Supabase Auth with ID: ${createData.user.id}`);
    authUserId = createData.user.id;
  }

  // 2. Link this Supabase auth UID to the Postgres user profile
  console.log(`Linking auth ID ${authUserId} to user ${ADMIN_EMAIL} in PostgreSQL...`);
  
  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL }
  });

  if (!user) {
    throw new Error(`User with email ${ADMIN_EMAIL} not found in PostgreSQL. Please run seed script first.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      authId: authUserId,
      isSuperAdmin: true 
    }
  });

  console.log("✅ Super Admin user linked successfully!");
  console.log("--------------------------------------------------");
  console.log("Log in details for development:");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("Super Admin: true");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Setup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
