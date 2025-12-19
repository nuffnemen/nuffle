"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function updateUser(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) redirect("/");

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as Role;
  const name = (formData.get("name") as string) ?? "";
  const email = ((formData.get("email") as string) ?? "").trim();

  if (!userId || !role || !email) {
    redirect("/admin/settings");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim() || null,
      email: email.trim(),
      role,
    },
  });

  revalidatePath("/admin/settings");
}

export async function deleteUser(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) redirect("/");

  const userId = formData.get("userId") as string;
  if (!userId) {
    redirect("/admin/settings");
    return;
  }

  if (userId === user.id) {
    redirect("/admin/settings");
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      name: null,
      email: `deleted-${userId}@cambria.local`,
      role: Role.STUDENT,
    },
  });

  revalidatePath("/admin/settings");
}
