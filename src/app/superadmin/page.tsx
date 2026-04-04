import React from "react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/tenant";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
  // 1. Secure routing: require super-admin session
  await requireSuperAdmin();

  // 2. Fetch companies list directly on the server
  const companies = await prisma.company.findMany({
    include: {
      users: {
        where: { role: "OWNER" },
        select: { email: true },
      },
      subscription: {
        select: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Serialize data safely
  const serializedCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    industry: c.industry,
    createdAt: c.createdAt.toISOString(),
    users: c.users,
    plan: c.subscription?.plan || "starter",
  }));

  return <SuperAdminClient initialCompanies={serializedCompanies} />;
}
