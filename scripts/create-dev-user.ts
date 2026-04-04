import { prisma } from '@/lib/prisma';

async function main() {
  // Create or get a demo company
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

  // Create or get a super‑admin user linked to that company
  const user = await prisma.user.upsert({
    where: { authId: 'demo-auth-id' },
    update: {},
    create: {
      id: 'demo-user-id',
      authId: 'demo-auth-id',
      email: 'admin@example.com',
      name: 'Demo Admin',
      role: 'OWNER',
      isSuperAdmin: true,
      companyId: company.id,
    },
  });

  console.log('✅ Demo super‑admin created →', user.email);
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
