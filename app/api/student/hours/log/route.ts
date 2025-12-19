import { NextResponse } from "next/server";
import { ProgramKey, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifyHoursLogged } from "@/lib/notifications";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const minutes = Number(body.minutes ?? 0);
  const programKeyValue = body.programKey as string | undefined;
  const programKey = programKeyValue ? (programKeyValue as ProgramKey) : null;
  const startedAt = body.startedAt ? new Date(body.startedAt as string) : null;
  const endedAt = body.endedAt ? new Date(body.endedAt as string) : null;

  if (!minutes || minutes <= 0 || !programKey) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (startedAt && isNaN(startedAt.valueOf())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  if (endedAt && isNaN(endedAt.valueOf())) {
    return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
  }

  const entry = await prisma.hourEntry.create({
    data: {
      studentId: user.id,
      minutes: Math.round(minutes),
      date: startedAt ?? new Date(),
      startedAt,
      endedAt,
      status: "PENDING",
      createdById: user.id,
      programKey,
    },
  });

  await notifyHoursLogged(user.name ?? user.email, Math.round(minutes), entry.id);

  revalidatePath("/student");
  revalidatePath("/student/hours");
  return NextResponse.json({ success: true });
}
