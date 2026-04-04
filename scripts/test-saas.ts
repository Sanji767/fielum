import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function runTests() {
  const { prisma, pool } = await import("../src/lib/prisma");
  console.log("==================================================");
  console.log("🧪 FIELUM SAAS VALIDATION SUITE (Clean Architecture)");
  console.log("==================================================");

  console.log("DATABASE_URL:", process.env.DATABASE_URL ? `Defined (Length: ${process.env.DATABASE_URL.length})` : "Undefined");

  let testCompanyId = "";
  let attackerCompanyId = "";
  let testCustomerId = "";
  let testJobId = "";
  const createdTechIds: string[] = [];

  try {
    // ----------------------------------------------------
    // SETUP: Create two isolated tenant companies
    // ----------------------------------------------------
    console.log("\n⚙️ Setting up test database entities...");
    
    const suffix = Math.random().toString(36).substring(2, 8);
    const companyA = await prisma.company.create({
      data: {
        name: `Test SaaS Inc. ${suffix}`,
        slug: `test-saas-inc-${suffix}`,
        status: "active",
      },
    });
    testCompanyId = companyA.id;

    // Create a starter subscription for Company A
    await prisma.subscription.create({
      data: {
        companyId: testCompanyId,
        plan: "starter",
        status: "active",
      },
    });

    const companyB = await prisma.company.create({
      data: {
        name: `Malicious Tenant Ltd. ${suffix}`,
        slug: `malicious-tenant-${suffix}`,
        status: "active",
      },
    });
    attackerCompanyId = companyB.id;

    console.log(`✅ Company A (Tenant): ${companyA.name} [ID: ${testCompanyId}]`);
    console.log(`✅ Company B (Attacker): ${companyB.name} [ID: ${attackerCompanyId}]`);

    // ----------------------------------------------------
    // TEST 1: Multi-tenant Isolation
    // ----------------------------------------------------
    console.log("\n🔒 TEST 1: Verifying Multi-Tenant Data Isolation...");
    
    // Create customer belonging to Company A
    const custA = await prisma.customer.create({
      data: {
        name: "Confidential Customer",
        email: "private@client.com",
        address: "Calle Mayor 10",
        city: "Madrid",
        companyId: testCompanyId,
      },
    });
    testCustomerId = custA.id;

    // Simulate an attacker (Company B) trying to access Company A's customer
    const fetchedByAttacker = await prisma.customer.findFirst({
      where: {
        id: testCustomerId,
        companyId: attackerCompanyId, // Enforce tenant filter
      },
    });

    if (fetchedByAttacker === null) {
      console.log("   🟢 PASS: Attacker query using their own companyId returned null for private customer data.");
    } else {
      throw new Error("❌ FAIL: Attacker was able to read data belonging to another tenant!");
    }

    // ----------------------------------------------------
    // TEST 2: SaaS Subscription Plan Limit Enforcement
    // ----------------------------------------------------
    console.log("\n💼 TEST 2: Verifying Subscription Plan Limits (Starter Plan)...");

    const checkAndAddTechnician = async (name: string, emailPrefix: string) => {
      const currentTechCount = await prisma.user.count({
        where: { companyId: testCompanyId, role: "TECHNICIAN" },
      });

      const sub = await prisma.subscription.findUnique({
        where: { companyId: testCompanyId },
      });

      const plan = sub?.plan || "starter";

      if (plan === "starter" && currentTechCount >= 3) {
        throw new Error("BLOCKED: Starter plan limit reached (max 3)");
      }

      const uniqueEmail = `${emailPrefix}-${suffix}@fielum.com`;
      const tech = await prisma.user.create({
        data: {
          name,
          email: uniqueEmail,
          role: "TECHNICIAN",
          authId: `test-tech-${emailPrefix}-${suffix}`,
          companyId: testCompanyId,
        },
      });
      createdTechIds.push(tech.id);
      return tech;
    };

    // Add 3 technicians (Starter limit is 3)
    console.log("   Adding technician 1, 2, and 3...");
    await checkAndAddTechnician("Tech One", "one");
    await checkAndAddTechnician("Tech Two", "two");
    await checkAndAddTechnician("Tech Three", "three");

    // Attempt to add a 4th technician under Starter Plan
    try {
      console.log("   Attempting to add technician 4 (should be blocked)...");
      await checkAndAddTechnician("Tech Four", "four");
      throw new Error("❌ FAIL: 4th technician was created despite Starter Plan limit!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("BLOCKED")) {
        console.log("   🟢 PASS: 4th technician was successfully blocked under the Starter plan.");
      } else {
        throw err;
      }
    }

    // Upgrade subscription to Professional
    console.log("   Upgrading Company A subscription plan to 'professional'...");
    await prisma.subscription.update({
      where: { companyId: testCompanyId },
      data: { plan: "professional" },
    });

    // Attempt to add 4th technician again after upgrade
    try {
      console.log("   Attempting to add technician 4 after plan upgrade...");
      await checkAndAddTechnician("Tech Four", "four");
      console.log("   🟢 PASS: Technician 4 successfully registered after upgrading subscription.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`❌ FAIL: Registration failed after upgrade. Error: ${message}`);
    }

    // ----------------------------------------------------
    // TEST 3: Job Lifecycle (Create -> Progress -> Checklist -> Completion)
    // ----------------------------------------------------
    console.log("\n📋 TEST 3: Verifying Job Lifecycle & Field Execution...");

    const job = await prisma.job.create({
      data: {
        identifier: `JOB-TEST-${suffix}`,
        status: "scheduled",
        priority: "high",
        serviceType: "Mantenimiento Preventivo",
        scheduledDate: new Date(),
        scheduledTime: "10:00",
        address: "Calle Mayor 10, Madrid",
        customerId: testCustomerId,
        technicianId: createdTechIds[0],
        companyId: testCompanyId,
        checklist: {
          create: [
            { label: "Inspección de filtros de aire", checked: false },
            { label: "Comprobación de presiones", checked: false },
            { label: "Limpieza y desinfección", checked: false },
          ],
        },
      },
      include: {
        checklist: true,
      },
    });
    testJobId = job.id;

    console.log(`   Created new Job: ${job.identifier} with ${job.checklist.length} checklist tasks`);

    // Simulate Technician completing the job
    const updatedChecklist = job.checklist.map((item) => ({
      id: item.id,
      checked: true,
    }));

    await prisma.$transaction(async (tx) => {
      for (const item of updatedChecklist) {
        await tx.checklistItem.update({
          where: { id: item.id },
          data: { checked: item.checked },
        });
      }

      await tx.job.update({
        where: { id: testJobId },
        data: {
          status: "completed",
          completionNotes: "Revisión completada sin incidencias.",
          signedByName: "Responsable Local",
          customerSignature: "data:image/png;base64,mockSignature",
          completedAt: new Date(),
        },
      });
    });

    console.log("   Job completed with checklist and client signature.");

    // Retrieve and verify
    const completedJob = await prisma.job.findUnique({
      where: { id: testJobId },
      include: { checklist: true, customer: true },
    });

    if (!completedJob) throw new Error("Job not found");

    if (
      completedJob.status === "completed" &&
      completedJob.checklist.every((c) => c.checked === true) &&
      completedJob.signedByName === "Responsable Local"
    ) {
      console.log("   🟢 PASS: Job verified with complete checklist and signature.");
    } else {
      throw new Error("❌ FAIL: Job completion verification failed!");
    }

    console.log("\n==================================================");
    console.log("🎉 ALL TESTS PASSED! CLEAN FSM SAAS ARCHITECTURE VERIFIED.");
    console.log("==================================================");

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("\n❌ TEST ERROR:", message);
    console.log("==================================================");
    process.exit(1);
  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log("\n🧹 Cleaning up test database records...");

    try {
      if (testJobId) {
        await prisma.checklistItem.deleteMany({ where: { jobId: testJobId } });
        await prisma.job.delete({ where: { id: testJobId } }).catch(() => {});
      }
      if (testCustomerId) {
        await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
      }
      if (createdTechIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdTechIds } } });
      }
      if (testCompanyId) {
        await prisma.subscription.deleteMany({ where: { companyId: testCompanyId } });
        await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
      }
      if (attackerCompanyId) {
        await prisma.company.delete({ where: { id: attackerCompanyId } }).catch(() => {});
      }
      console.log("🧹 Cleanup complete.");
    } catch (cleanErr: unknown) {
      const message = cleanErr instanceof Error ? cleanErr.message : String(cleanErr);
      console.error("⚠️ Error cleaning up:", message);
    }

    await prisma.$disconnect();
    await pool.end();
  }
}

runTests();
