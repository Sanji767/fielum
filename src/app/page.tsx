import React from "react";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import FielumConsole from "./FielumConsole";

export const dynamic = "force-dynamic";

export default async function Page() {
  // 1. Resolve active tenant context securely.
  const ctx = await getTenantContext();
  const companyId = ctx.companyId;
  const isTechnician = ctx.user.role === "TECHNICIAN";

  // 2. Fetch all domain entities scoped by companyId and role
  const dbCustomers = isTechnician
    ? [] // Technicians don't need full customer directory
    : await prisma.customer.findMany({
        where: { companyId },
        include: {
          jobs: {
            select: { id: true, status: true },
          },
        },
        orderBy: { name: "asc" },
      });

  const dbJobs = await prisma.job.findMany({
    where: {
      companyId,
      ...(isTechnician ? { technicianId: ctx.userId } : {}),
    },
    include: {
      customer: true,
      technician: true,
      checklist: {
        orderBy: { id: "asc" },
      },
      photos: true,
    },
    orderBy: { scheduledDate: "desc" },
  });

  const dbTechnicians = isTechnician
    ? []
    : await prisma.user.findMany({
        where: {
          companyId,
          role: "TECHNICIAN",
        },
        include: {
          invitationTokens: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      });

  const dbSubscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  // 3. Transform to clean client-ready data structures
  const customers = dbCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || "",
    address: c.address || "",
    city: c.city || "",
    state: c.state || "",
    zip: c.zip || "",
    notes: c.notes || "",
    jobCount: c.jobs.length,
  }));

  const jobs = dbJobs.map((j) => ({
    id: j.id,
    identifier: j.identifier,
    status: j.status,
    priority: j.priority,
    serviceType: j.serviceType,
    scheduledDate: j.scheduledDate.toISOString().split("T")[0],
    scheduledTime: j.scheduledTime,
    durationMinutes: j.durationMinutes,
    address: j.address || `${j.customer.address}, ${j.customer.city}`.replace(/^, |, $/g, ""),
    notes: j.notes || "",
    completionNotes: j.completionNotes || "",
    customerId: j.customerId,
    customerName: j.customer.name,
    customerPhone: j.customer.phone,
    customerEmail: j.customer.email,
    technicianId: j.technicianId,
    technicianName: j.technician?.name || null,
    checklist: j.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      checked: item.checked,
    })),
    photos: j.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
    })),
    customerSignature: j.customerSignature,
    signedByName: j.signedByName,
    completedAt: j.completedAt ? j.completedAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const technicians = dbTechnicians.map((t) => {
    const latestToken = t.invitationTokens[0];
    const isPending = !t.authId || t.authId.startsWith("invited-tech-");
    const activationUrl = latestToken && isPending ? `${appUrl}/activate?token=${latestToken.token}` : null;

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone || "",
      role: t.role,
      isPending,
      activationUrl,
      active: true,
    };
  });

  const subscription = dbSubscription ? {
    plan: dbSubscription.plan as "starter" | "professional" | "business",
    status: dbSubscription.status,
    currentPeriodEnd: dbSubscription.currentPeriodEnd ? dbSubscription.currentPeriodEnd.toISOString() : null,
  } : {
    plan: "starter" as const,
    status: "active",
    currentPeriodEnd: null,
  };

  return (
    <FielumConsole
      initialCustomers={customers}
      initialJobs={jobs}
      initialTechnicians={technicians}
      companyName={ctx.company.name}
      companyIndustry={ctx.company.industry}
      userId={ctx.userId}
      userEmail={ctx.user.email}
      userName={ctx.user.name}
      userRole={ctx.user.role}
      isSuperAdmin={ctx.isSuperAdmin}
      locale={ctx.company.locale}
      subscription={subscription}
    />
  );
}
