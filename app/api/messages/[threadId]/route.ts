import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyMessageParticipants } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId?: string }> },
) {
  const { threadId } = await params;
  if (!threadId) {
    return NextResponse.json({ error: "Missing thread id" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json().catch(() => ({}));
  const body = typeof data.body === "string" ? data.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: user.id } },
  });
  if (!participant) {
    return NextResponse.json({ error: "Not part of this thread" }, { status: 403 });
  }

  await prisma.message.create({
    data: { threadId, senderId: user.id, body },
  });
  await prisma.thread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });

  const participants = await prisma.threadParticipant.findMany({
    where: { threadId },
    select: { userId: true },
  }) satisfies { userId: string }[];
  await notifyMessageParticipants(
    threadId,
    user.id,
    user.name ?? user.email,
    participants.map((p) => p.userId),
    body,
  );

  return NextResponse.json({ ok: true });
}
