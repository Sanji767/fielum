import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

/**
 * Creates a Supabase Auth user (email/password) and the corresponding Prisma User record.
 * Uses the service_role key so it can run admin operations.
 */
async function main() {
  // Initialise Supabase client with the service role key (add this env var to .env.local)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const email = 'mohamedelabyad56@gmail.com';
  const password = 'A123456678a';

let authUser: any = null;
  // Intentamos crear el usuario
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError && !createError.message?.includes('User already exists')) {
    throw createError;
  }

  if (created?.user) {
    authUser = created.user;
  } else {
    // Si ya existía, buscarlo en la lista de usuarios
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    authUser = listData?.users?.find((u) => u.email === email);
    if (!authUser) throw new Error('User not found after listing');
  }

  console.log('✅ Supabase auth user ready →', authUser.id);

  // 2️⃣ Ensure a demo company exists (reuse the same logic as the previous script)
  const company = await prisma.company.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      id: 'demo-company-id',
      name: 'Demo Company',
      slug: 'demo',
      status: 'active',
      industry: 'general',
      currency: 'EUR',
      taxRate: 21,
      jobPrefix: 'JOB-',
      invoicePrefix: 'INV-',
      locale: 'es',
      timezone: 'Europe/Madrid',
    },
  });

  // 3️⃣ Upsert the Prisma user that links to the Supabase authId
  const user = await prisma.user.upsert({
    where: { authId: authUser!.id },
    update: {},
    create: {
      id: 'demo-user-id',
      authId: authUser!.id,
      email,
      name: 'Demo Admin',
      role: 'OWNER',
      isSuperAdmin: true,
      companyId: company.id,
    },
  });

  console.log('✅ Prisma user linked →', user.email);
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo auth user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
