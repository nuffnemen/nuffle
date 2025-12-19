"use server";

import { AttendanceStatus, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function parseLocalDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export async function saveAttendance(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const dateInput = formData.get("date") as string;
  const parsedDate = parseLocalDate(dateInput);
  const date = parsedDate ?? new Date();
  date.setHours(0, 0, 0, 0);

  const studentIds = formData.getAll("studentIds").map((value) => String(value));
  const presentIds = new Set(formData.getAll("presentIds").map((value) => String(value)));

  if (!studentIds.length) {
    redirect("/instructor/attendance");
  }

  const updates = studentIds.map((studentId) => {
    const status = presentIds.has(studentId) ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
    return prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
      create: {
        studentId,
        recordedById: user.id,
        date,
        status,
      },
      update: {
        recordedById: user.id,
        status,
      },
    });
  });

  await prisma.$transaction(updates);
  const dateKey = parseDateKey(date);
  const path = `/instructor/attendance?date=${dateKey}`;
  revalidatePath(path);
  redirect(path);
}
