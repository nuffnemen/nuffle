import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { notifyAssignmentSubmitted } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const textAnswer = (formData.get("textAnswer") as string) || null;
  const attachments = formData.getAll("attachments") as File[];

  const attachmentRefs: string[] = [];
  for (const file of attachments) {
    if (file && file.size > 0) {
      const ref = await uploadFile(file);
      if (ref) attachmentRefs.push(ref);
    }
  }

  const existing = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: id,
        studentId: user.id,
      },
    },
  });

  if (existing && !existing.canResubmit) {
    return NextResponse.json(
      { error: "Submission locked. Request another attempt from your instructor." },
      { status: 400 },
    );
  }

  if (existing) {
    await prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        textAnswer,
        attachmentRefs: attachmentRefs.length ? attachmentRefs : undefined,
        status: "SUBMITTED",
        canResubmit: false,
        resubmissionRequested: false,
      },
    });
  } else {
    await prisma.assignmentSubmission.create({
      data: {
        assignmentId: id,
        studentId: user.id,
        textAnswer,
        attachmentRefs,
        canResubmit: false,
        resubmissionRequested: false,
      },
    });
  }

  await notifyAssignmentSubmitted(
    id,
    user.id,
    user.name ?? user.email,
    assignment.createdById,
    assignment.title,
  );

  revalidatePath(`/student/assignments/${id}`);
  revalidatePath("/student/assignments");
  revalidatePath(`/instructor/assignments/${id}`);
  return NextResponse.json({ ok: true });
}
