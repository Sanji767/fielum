require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const authId = '99215d47-cd53-484f-8e1d-f027e9f6afb2';
  const email = 'mohamedelabyad56@gmail.com';

  // 1. Ensure demo company exists
  const company = await prisma.company.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
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
  console.log('Company:', company.id, company.name);

  // 2. Upsert the User linked to the Supabase auth ID
  const user = await prisma.user.upsert({
    where: { authId },
    update: { email },
    create: {
      authId,
      email,
      name: 'Mohamed El Abyad',
      role: 'OWNER',
      isSuperAdmin: true,
      companyId: company.id,
    },
  });
  console.log('User:', user.id, user.email, '| superAdmin:', user.isSuperAdmin, '| companyId:', user.companyId);

  // 3. List all users in DB
  const allUsers = await prisma.user.findMany({ select: { email: true, authId: true, role: true, isSuperAdmin: true } });
  console.log('\nAll DB users:');
  allUsers.forEach(u => console.log(`  - ${u.email} | authId: ${u.authId} | role: ${u.role} | superAdmin: ${u.isSuperAdmin}`));
}

main()
  .catch(e => console.error('Error:', e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
