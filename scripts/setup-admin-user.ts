import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setup() {
  console.log("🔐 Creating Admin / Owner User in Supabase Auth...");

  const email = "admin@fielum.com";
  const password = "Password123!";

  // 1. Get or create Company
  let company = await prisma.company.findFirst({
    where: { slug: "climatech" },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "ClimaTech Soluciones S.L.",
        slug: "climatech",
        status: "active",
        industry: "Climatización y Frío",
      },
    });
  }

  // 2. Check if user exists in Supabase Auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
  }

  const existingAuthUser = usersData?.users.find((u) => u.email === email);
  let authUid = "";

  if (existingAuthUser) {
    console.log(`Found existing auth user: ${existingAuthUser.id}. Updating password...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
    });
    if (updateError) console.error("Error updating user:", updateError);
    authUid = existingAuthUser.id;
  } else {
    console.log(`Creating new auth user: ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Admin Fielum" },
    });
    if (createError) {
      console.error("Error creating user:", createError);
      process.exit(1);
    }
    authUid = createData.user.id;
  }

  // 3. Upsert Prisma User record linked to this authId
  const dbUser = await prisma.user.upsert({
    where: { email },
    update: {
      authId: authUid,
      name: "Juan Pérez (Admin)",
      role: "OWNER",
      isSuperAdmin: true,
      companyId: company.id,
    },
    create: {
      email,
      authId: authUid,
      name: "Juan Pérez (Admin)",
      role: "OWNER",
      isSuperAdmin: true,
      companyId: company.id,
    },
  });

  console.log("==================================================");
  console.log("🎉 CREDENCIALES LISTAS PARA INICIAR SESIÓN:");
  console.log("==================================================");
  console.log(`📧 Email:       ${email}`);
  console.log(`🔑 Contraseña:  ${password}`);
  console.log(`🏢 Empresa:     ${company.name}`);
  console.log(`🛡️ Super Admin: Sí`);
  console.log("==================================================");

  await prisma.$disconnect();
  await pool.end();
}

setup().catch((e) => {
  console.error(e);
  process.exit(1);
});
