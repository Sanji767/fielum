import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContextApi } from "@/lib/tenant";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getTenantContextApi();
  if (auth.error || !auth.context) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      status,
      checklist,
      completionNotes,
      customerSignature,
      signedByName,
    } = body;

    // Verify job belongs to company
    const existingJob = await prisma.job.findFirst({
      where: {
        id,
        companyId: auth.context.companyId,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Role check: technicians can only complete their own assigned jobs
    if (auth.context.role === "TECHNICIAN" && existingJob.technicianId !== auth.context.userId) {
      return NextResponse.json({ error: "Permiso denegado: solo puedes actualizar tus propios trabajos asignados." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update checklist items if provided
      if (Array.isArray(checklist)) {
        for (const item of checklist) {
          if (item.id) {
            await tx.checklistItem.update({
              where: { id: item.id },
              data: { checked: Boolean(item.checked) },
            });
          }
        }
      }

      // 2. Update job record
      await tx.job.update({
        where: { id },
        data: {
          status: status || "completed",
          completionNotes: completionNotes !== undefined ? completionNotes : existingJob.completionNotes,
          customerSignature: customerSignature || existingJob.customerSignature,
          signedByName: signedByName || existingJob.signedByName,
          completedAt: status === "completed" ? new Date() : existingJob.completedAt,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
