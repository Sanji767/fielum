import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export interface TenantContext {
  userId: string;
  companyId: string;
  role: string;
  isSuperAdmin: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    locale: string;
    isSuperAdmin: boolean;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    currency: string;
    taxRate: number;
    invoicePrefix: string;
    jobPrefix: string;
    locale: string;
    timezone: string;
  };
}

/**
 * Resolves the authenticated user's tenant context.
 * Use in Server Components and Server Actions.
 * Redirects to /login if unauthenticated or no DB profile.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
  where: { authId: authUser.id },
  include: { company: true },
});
if (user) {
  await prisma.$executeRawUnsafe(`SET myapp.current_company_id = '${user.companyId}'`);
}

  if (!user) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      locale: user.company.locale,
      isSuperAdmin: user.isSuperAdmin,
    },
    company: {
      id: user.company.id,
      name: user.company.name,
      slug: user.company.slug,
      industry: user.company.industry,
      currency: user.company.currency,
      taxRate: Number(user.company.taxRate),
      invoicePrefix: user.company.invoicePrefix,
      jobPrefix: user.company.jobPrefix,
      locale: user.company.locale,
      timezone: user.company.timezone,
    },
  };
}

/**
 * Resolves tenant context for API Route Handlers.
 * Returns { error, status, context } instead of redirecting.
 */
export async function getTenantContextApi(): Promise<
  | { error: string; status: number; context: null }
  | { error: null; status: 200; context: TenantContext }
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { error: "Unauthorized", status: 401, context: null };

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { company: true },
  });

  if (!user) return { error: "User profile not found", status: 403, context: null };

  return {
    error: null,
    status: 200,
    context: {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        locale: user.company.locale,
        isSuperAdmin: user.isSuperAdmin,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        industry: user.company.industry,
        currency: user.company.currency,
        taxRate: Number(user.company.taxRate),
        invoicePrefix: user.company.invoicePrefix,
        jobPrefix: user.company.jobPrefix,
        locale: user.company.locale,
        timezone: user.company.timezone,
      },
    },
  };
}

/**
 * Require super-admin access. Redirects to / if not super-admin.
 */
export async function requireSuperAdmin(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) redirect("/");
  return ctx;
}
