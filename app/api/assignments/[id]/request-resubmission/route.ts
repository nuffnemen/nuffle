import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submission = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: id,
        studentId: user.id,
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submit the assignment before requesting another attempt." }, { status: 400 });
  }

  if (submission.canResubmit) {
    return NextResponse.json({ error: "You already have an open submission window." }, { status: 400 });
  }

  if (submission.resubmissionRequested) {
    return NextResponse.json({ error: "Resubmission already requested. Please wait for approval." }, { status: 400 });
  }

  await prisma.assignmentSubmission.update({
    where: { id: submission.id },
    data: { resubmissionRequested: true },
  });

  revalidatePath(`/student/assignments/${id}`);
  revalidatePath(`/instructor/assignments/${id}`);
  return NextResponse.json({ ok: true });
}

