"use server";

import { ProgramKey, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function manualAdd(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const studentId = formData.get("studentId") as string;
  const minutes = Number(formData.get("minutes"));
  const date = new Date(formData.get("date") as string);
  const notes = (formData.get("notes") as string) || null;
  const programKeyValue = formData.get("programKey") as string | null;
  const programKey = programKeyValue ? (programKeyValue as ProgramKey) : null;

  if (!studentId || !minutes || minutes <= 0) {
    throw new Error("Missing data");
  }

  await prisma.hourEntry.create({
    data: {
      studentId,
      minutes: Math.round(minutes),
      date,
      notes,
      programKey,
      status: "APPROVED",
      createdById: user.id,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/instructor/hours");
  revalidatePath("/student");
}
