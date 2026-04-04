import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed (Fielum Sleek Dark UI Scenario)...");

  // 1. Clean existing records
  await prisma.jobPhoto.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.invitationToken.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // 2. Create Tenant Company
  const company1 = await prisma.company.create({
    data: {
      name: "Fielum Services Ltd",
      slug: "fielum-services",
      status: "active",
      industry: "Field Maintenance",
      currency: "EUR",
      jobPrefix: "JOB-",
      locale: "en",
    },
  });

  // Subscription Starter
  await prisma.subscription.create({
    data: {
      companyId: company1.id,
      plan: "starter",
      status: "active",
    },
  });

  // 3. Create Admin / Owner
  await prisma.user.create({
    data: {
      authId: "0b15b3c3-380d-40aa-bce9-bf6b47c0b0ee", // Supabase auth user
      email: "admin@fielum.com",
      name: "Mark",
      phone: "+31 6 11223344",
      role: "OWNER",
      isSuperAdmin: true,
      companyId: company1.id,
    },
  });

  const tech1 = await prisma.user.create({
    data: {
      authId: "auth-tech-1",
      email: "br@fielum.com",
      name: "Bas Ruys",
      phone: "+31 6 55443322",
      role: "TECHNICIAN",
      companyId: company1.id,
    },
  });

  const tech2 = await prisma.user.create({
    data: {
      authId: "auth-tech-2",
      email: "fm@fielum.com",
      name: "Frank Mulder",
      phone: "+31 6 66778899",
      role: "TECHNICIAN",
      companyId: company1.id,
    },
  });

  // 4. Create Customers matching screenshot
  const cust1 = await prisma.customer.create({
    data: {
      name: "J. Bakker",
      email: "j.bakker@amsterdam.nl",
      phone: "+31 20 555 1234",
      address: "Keizersgracht 420",
      city: "Amsterdam",
      companyId: company1.id,
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      name: "R. de Vries",
      email: "r.devries@rotterdam.nl",
      phone: "+31 10 444 9876",
      address: "Witte de Withstraat 18",
      city: "Rotterdam",
      companyId: company1.id,
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      name: "Gym FitLife",
      email: "facility@gymfitlife.nl",
      phone: "+31 30 888 2211",
      address: "Oudegracht 99",
      city: "Utrecht",
      companyId: company1.id,
    },
  });

  const cust4 = await prisma.customer.create({
    data: {
      name: "Hotel Prinsengracht",
      email: "maint@hotelprinsen.nl",
      phone: "+31 20 666 4321",
      address: "Prinsengracht 110",
      city: "Amsterdam",
      companyId: company1.id,
    },
  });

  // 5. Create Jobs (Total 7 jobs today, 2 in progress, 1 completed, 4 scheduled)
  const today = new Date();

  const job1 = await prisma.job.create({
    data: {
      identifier: "JOB-101",
      status: "scheduled",
      priority: "normal",
      serviceType: "Boiler service",
      scheduledDate: today,
      scheduledTime: "08:00",
      durationMinutes: 90,
      address: "Keizersgracht 420, Amsterdam",
      notes: "Annual boiler inspection and pressure check.",
      customerId: cust1.id,
      technicianId: tech1.id,
      companyId: company1.id,
    },
  });

  const job2 = await prisma.job.create({
    data: {
      identifier: "JOB-102",
      status: "in_progress",
      priority: "urgent",
      serviceType: "Leak repair",
      scheduledDate: today,
      scheduledTime: "09:00",
      durationMinutes: 60,
      address: "Witte de Withstraat 18, Rotterdam",
      notes: "Pipe leakage in second floor bathroom.",
      customerId: cust2.id,
      technicianId: tech2.id,
      companyId: company1.id,
    },
  });

  const job3 = await prisma.job.create({
    data: {
      identifier: "JOB-103",
      status: "completed",
      priority: "high",
      serviceType: "Installation",
      scheduledDate: today,
      scheduledTime: "11:00",
      durationMinutes: 120,
      address: "Oudegracht 99, Utrecht",
      notes: "New HVAC duct installation in fitness studio.",
      completionNotes: "Ducts mounted and sealed. Airflow verified.",
      signedByName: "Floor Manager",
      completedAt: new Date(),
      customerId: cust3.id,
      technicianId: tech1.id,
      companyId: company1.id,
    },
  });

  const job4 = await prisma.job.create({
    data: {
      identifier: "JOB-104",
      status: "in_progress",
      priority: "high",
      serviceType: "Airco filter replacement",
      scheduledDate: today,
      scheduledTime: "13:30",
      durationMinutes: 60,
      address: "Prinsengracht 110, Amsterdam",
      notes: "Replace main lobby airco filters.",
      customerId: cust4.id,
      technicianId: tech2.id,
      companyId: company1.id,
    },
  });

  await prisma.job.create({
    data: {
      identifier: "JOB-105",
      status: "scheduled",
      priority: "normal",
      serviceType: "Thermostat calibration",
      scheduledDate: today,
      scheduledTime: "15:00",
      durationMinutes: 45,
      address: "Keizersgracht 420, Amsterdam",
      notes: "Calibrate smart thermostats in meeting rooms.",
      customerId: cust1.id,
      technicianId: tech1.id,
      companyId: company1.id,
    },
  });

  await prisma.job.create({
    data: {
      identifier: "JOB-106",
      status: "scheduled",
      priority: "low",
      serviceType: "Safety compliance inspection",
      scheduledDate: today,
      scheduledTime: "16:15",
      durationMinutes: 45,
      address: "Oudegracht 99, Utrecht",
      notes: "Quarterly fire damper and gas valve check.",
      customerId: cust3.id,
      technicianId: tech2.id,
      companyId: company1.id,
    },
  });

  await prisma.job.create({
    data: {
      identifier: "JOB-107",
      status: "scheduled",
      priority: "normal",
      serviceType: "Chiller maintenance",
      scheduledDate: today,
      scheduledTime: "17:30",
      durationMinutes: 60,
      address: "Prinsengracht 110, Amsterdam",
      notes: "Check refrigerant pressure and condenser coils.",
      customerId: cust4.id,
      technicianId: tech1.id,
      companyId: company1.id,
    },
  });

  // Checklists
  await prisma.checklistItem.createMany({
    data: [
      { jobId: job1.id, label: "Check burner flame pattern", checked: false },
      { jobId: job1.id, label: "Test flue gas pressure", checked: false },
      { jobId: job1.id, label: "Inspect safety relief valve", checked: false },

      { jobId: job2.id, label: "Shut off water main", checked: true },
      { jobId: job2.id, label: "Replace leaking elbow joint", checked: true },
      { jobId: job2.id, label: "Pressure test plumbing line", checked: false },

      { jobId: job3.id, label: "Mount ceiling brackets", checked: true },
      { jobId: job3.id, label: "Connect ventilation ductwork", checked: true },
      { jobId: job3.id, label: "Perform airflow calibration", checked: true },

      { jobId: job4.id, label: "Remove old dirty filters", checked: true },
      { jobId: job4.id, label: "Vacuum filter trays", checked: true },
      { jobId: job4.id, label: "Insert new HEPA units", checked: false },
    ],
  });

  console.log("🌱 Database seeded with 7 jobs matching target design!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
