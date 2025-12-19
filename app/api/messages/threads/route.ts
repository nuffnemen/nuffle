import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { notifyMessageParticipants } from "@/lib/notifications";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipientId, body } = await req.json().catch(() => ({}));
  const cleanBody = typeof body === "string" ? body.trim() : "";

  if (!recipientId || !cleanBody) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  if (user.role === Role.STUDENT) {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient || (recipient.role !== Role.INSTRUCTOR && recipient.role !== Role.HEAD_INSTRUCTOR && recipient.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Students can only message instructors/admins." }, { status: 403 });
    }
  }

  const thread = await prisma.thread.create({
    data: {
      participants: {
        create: [{ userId: user.id }, { userId: recipientId }],
      },
      messages: {
        create: [{ senderId: user.id, body: cleanBody }],
      },
      lastMessageAt: new Date(),
    },
  });

  await notifyMessageParticipants(thread.id, user.id, user.name ?? user.email, [recipientId], cleanBody);

  return NextResponse.json({ threadId: thread.id });
}
