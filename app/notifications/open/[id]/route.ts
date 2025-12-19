import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect("/notifications");

  if (!id) return NextResponse.redirect("/notifications");

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== user.id) {
    return NextResponse.redirect("/notifications");
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
  });

  let destination = notification.link ?? "/notifications";

  if (!notification.link && notification.metadata && typeof notification.metadata === "object") {
    const threadId = (notification.metadata as { threadId?: string }).threadId;
    if (threadId) {
      destination =
        user.role === Role.STUDENT
          ? `/student/messages/${threadId}`
          : `/instructor/messages/${threadId}`;
    }
  }

  return NextResponse.redirect(new URL(destination, req.url));
}
