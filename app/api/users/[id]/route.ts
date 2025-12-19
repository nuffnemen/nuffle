import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!targetId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const payload = await req.json().catch(() => ({}));
  const { name, classGroup, role } = payload as {
    name?: string | null;
    classGroup?: string | null;
    role?: Role;
  };

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let canEdit = false;
  if (user.role === Role.ADMIN) {
    canEdit = true;
  } else if (
    user.role === Role.HEAD_INSTRUCTOR ||
    user.role === Role.INSTRUCTOR
  ) {
    if (target.role === Role.STUDENT) {
      canEdit = true;
    }
  }

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: {
    name?: string | null;
    classGroup?: string | null;
    role?: Role;
  } = {};
  if (name !== undefined) data.name = name;
  if (classGroup !== undefined) data.classGroup = classGroup;

  if (role && user.role === Role.ADMIN) {
    data.role = role;
  }

  await prisma.user.update({
    where: { id: targetId },
    data,
  });

  return NextResponse.json({ ok: true });
}
