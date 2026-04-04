import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContextApi } from "@/lib/tenant";

export async function GET() {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: { companyId: auth.context.companyId },
      include: {
        jobs: {
          orderBy: { scheduledDate: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: customers });
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
    const { name, email, phone, address, city, state, zip, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || "",
        phone: phone || "",
        address: address || "",
        city: city || "",
        state: state || "",
        zip: zip || "",
        notes: notes || "",
        companyId: auth.context.companyId,
      },
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
