import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContextApi } from "@/lib/tenant";
import crypto from "crypto";

export async function GET() {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const companyId = auth.context.companyId;
    const technicians = await prisma.user.findMany({
      where: { companyId, role: "TECHNICIAN" },
      include: {
        invitationTokens: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const formatted = technicians.map((tech) => {
      const latestToken = tech.invitationTokens[0];
      const isPending = !tech.authId || tech.authId.startsWith("invited-tech-");
      const activationUrl = latestToken && isPending ? `${appUrl}/activate?token=${latestToken.token}` : null;

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        phone: tech.phone,
        role: tech.role,
        isPending,
        activationUrl,
        createdAt: tech.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y correo electrónico son requeridos" }, { status: 400 });
    }

    const companyId = auth.context.companyId;

    // 1. Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario registrado con este correo electrónico." },
        { status: 409 }
      );
    }

    // 2. Create technician and generate invitation token (No plan limits / Unrestricted during pilot)
    const tokenStr = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

    const result = await prisma.$transaction(async (tx) => {
      const tech = await tx.user.create({
        data: {
          email,
          name,
          phone: phone || "",
          role: "TECHNICIAN",
          authId: `invited-tech-${crypto.randomBytes(4).toString("hex")}`,
          companyId,
        },
      });

      const invitation = await tx.invitationToken.create({
        data: {
          userId: tech.id,
          token: tokenStr,
          expiresAt,
        },
      });

      return { tech, invitation };
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const activationUrl = `${appUrl}/activate?token=${result.invitation.token}`;

    return NextResponse.json({
      success: true,
      data: {
        id: result.tech.id,
        name: result.tech.name,
        email: result.tech.email,
        phone: result.tech.phone,
        role: result.tech.role,
        isPending: true,
        activationUrl,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
