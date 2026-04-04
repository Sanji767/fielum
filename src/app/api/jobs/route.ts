import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContextApi } from "@/lib/tenant";

export async function GET() {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const isTech = auth.context.role === "TECHNICIAN";
    const jobs = await prisma.job.findMany({
      where: {
        companyId: auth.context.companyId,
        ...(isTech ? { technicianId: auth.context.userId } : {}),
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

    return NextResponse.json({ success: true, data: jobs });
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

  // Technicians cannot dispatch new jobs
  if (auth.context.role === "TECHNICIAN") {
    return NextResponse.json({ error: "Permiso denegado: los técnicos no pueden crear ni despachar trabajos." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      customerId,
      technicianId,
      serviceType,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      address,
      notes,
      priority,
      checklist,
    } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Generate consecutive job identifier
    const count = await prisma.job.count({
      where: { companyId: auth.context.companyId },
    });
    const prefix = auth.context.company.jobPrefix || "JOB-";
    const identifier = `${prefix}${1001 + count}`;

    // Get customer address if address was not provided
    let jobAddress = address;
    if (!jobAddress) {
      const cust = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      jobAddress = cust ? `${cust.address}, ${cust.city}`.replace(/^, |, $/g, "") : "Ubicación del cliente";
    }

    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          identifier,
          status: "scheduled",
          priority: priority || "normal",
          serviceType: serviceType || "General",
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          scheduledTime: scheduledTime || "09:00",
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
          address: jobAddress || "",
          notes: notes || "",
          customerId,
          technicianId: technicianId || null,
          companyId: auth.context.companyId,
        },
      });

      const itemsToCreate = Array.isArray(checklist) && checklist.length > 0
        ? checklist
        : [
            "Inspección inicial y comprobación de funcionamiento",
            "Mantenimiento y revisión técnica",
            "Prueba de caudal y parámetros de operación",
            "Limpieza de área de trabajo",
          ];

      await tx.checklistItem.createMany({
        data: itemsToCreate.map((label: string) => ({
          jobId: newJob.id,
          label,
          checked: false,
        })),
      });

      return newJob;
    });

    return NextResponse.json({ success: true, data: job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
