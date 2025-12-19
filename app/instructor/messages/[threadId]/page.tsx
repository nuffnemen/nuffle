import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ThreadComposer from "@/app/components/messages/ThreadComposer";
import { markNotificationsForThread } from "@/lib/notifications";

export default async function InstructorThreadPage({
  params,
}: {
  params: Promise<{ threadId?: string }>;
}) {
  const { threadId } = await params;
  if (!threadId) {
    redirect("/instructor/messages");
  }
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: { include: { user: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: true },
      },
    },
  });
  if (!thread) notFound();
  const isParticipant = thread.participants.some((p) => p.userId === user.id);
  if (!isParticipant) redirect("/instructor/messages");

  await markNotificationsForThread(user.id, thread.id);

  return (
    <div className="stack">
      <section className="card">
        <h1>Chat</h1>
        <p style={{ marginTop: 4 }}>
          Participants:{" "}
          {thread.participants.map((p) => p.user?.name ?? p.user?.email ?? "Unknown").join(", ")}
        </p>

        <div className="chat-window">
          {thread.messages.map((message) => {
            const isMine = message.senderId === user.id;
            return (
              <div
                key={message.id}
                className={`chat-bubble ${isMine ? "chat-bubble-outgoing" : "chat-bubble-incoming"}`}
              >
                <div className="chat-bubble-meta">
                  {isMine ? "You" : message.sender?.name ?? message.sender?.email ?? "Unknown"} ·{" "}
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
                <p style={{ margin: 0 }}>{message.body}</p>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          <ThreadComposer threadId={thread.id} redirectPath={`/instructor/messages/${thread.id}`} />
        </div>
      </section>
    </div>
  );
}
