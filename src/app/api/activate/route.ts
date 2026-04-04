import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: {
        user: {
          include: { company: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid token." }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: "Token has already been used." }, { status: 410 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token has expired." }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      email: invitation.user.email,
      name: invitation.user.name,
      companyName: invitation.user.company.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, fullName, password, language } = body;

    if (!token || !fullName || !password) {
      return NextResponse.json(
        { error: "Token, full name, and password are required." },
        { status: 400 }
      );
    }

    // 1. Validate token
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: {
        user: {
          include: { company: true },
        },
      },
    });

    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid, used, or expired invitation token." },
        { status: 400 }
      );
    }

    const user = invitation.user;
    const supabaseAdmin = createAdminClient();
    let authUid = "";

    // 2. Check if user already exists in Supabase Auth or create new
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = usersData?.users.find((u) => u.email === user.email);

    if (existingAuthUser) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: { name: fullName },
        }
      );
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      authUid = existingAuthUser.id;
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: fullName,
        },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      if (!authData.user) {
        return NextResponse.json({ error: "Failed to create authentication user." }, { status: 500 });
      }
      authUid = authData.user.id;
    }

    // 3. Update database records within transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          authId: authUid,
          name: fullName,
        },
      });

      await tx.company.update({
        where: { id: user.companyId },
        data: {
          locale: language || user.company.locale || "es",
        },
      });

      await tx.invitationToken.update({
        where: { id: invitation.id },
        data: {
          usedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
