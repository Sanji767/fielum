import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContextApi } from "@/lib/tenant";
import crypto from "crypto";

export async function GET() {
  // Check authorization
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }
  if (!auth.context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companies = await prisma.company.findMany({
      include: {
        users: {
          where: { role: "OWNER" },
          select: { email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ companies });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Check authorization
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }
  if (!auth.context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, industry, plan, ownerEmail } = body;

    if (!name || !ownerEmail) {
      return NextResponse.json(
        { error: "Company name and owner email are required." },
        { status: 400 }
      );
    }

    // Generate unique slug from company name
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check slug collision
    const existingCompany = await prisma.company.findUnique({
      where: { slug },
    });
    if (existingCompany) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 }
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 86400000 * 7); // 7 Days expiration

    // Database transaction to create tenant, owner, and token
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name,
          slug,
          status: "trial",
          industry: industry || "hvac",
          locale: "es",
        },
      });

      // User needs authId. We create a temporary placeholder.
      // It will be replaced with real Supabase auth UID upon account activation.
      const user = await tx.user.create({
        data: {
          authId: `pending_${crypto.randomUUID()}`,
          email: ownerEmail,
          name: "Owner",
          role: "OWNER",
          companyId: company.id,
        },
      });

      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: plan || "starter",
          status: "trialing",
        },
      });

      const invitation = await tx.invitationToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      return { company, token: invitation.token };
    });

    return NextResponse.json({
      success: true,
      company: result.company,
      token: result.token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // Check authorization
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }
  if (!auth.context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, industry, status, plan } = body;

    if (!id || !name || !status) {
      return NextResponse.json(
        { error: "Company ID, name, and status are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update company details
      const company = await tx.company.update({
        where: { id },
        data: {
          name,
          industry,
          status,
        },
      });

      // 2. Update subscription plan
      if (plan) {
        await tx.subscription.upsert({
          where: { companyId: id },
          update: {
            plan,
          },
          create: {
            companyId: id,
            plan,
            status: status === "active" ? "active" : "trialing",
          },
        });
      }

      return company;
    });

    return NextResponse.json({
      success: true,
      company: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
