import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewThreadForm from "@/app/components/messages/NewThreadForm";

export default async function StudentMessagesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

  const [threads, instructors] = await Promise.all([
    prisma.thread.findMany({
      where: { participants: { some: { userId: user.id } } },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
        participants: {
          include: { user: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: [Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR, Role.ADMIN] } },
      orderBy: { name: "asc" },
    }),
  ]);

  const options = instructors.map((inst) => ({
    id: inst.id,
    label: `${inst.name ?? inst.email} (${inst.role})`,
  }));

  return (
    <div className="stack">
      <section className="card">
        <h1>Start a conversation</h1>
        <p style={{ marginBottom: 16 }}>Choose an instructor to open a thread instantly.</p>
        <NewThreadForm options={options} redirectBase="/student/messages" />
      </section>

      <section className="card">
        <h2>Threads</h2>
        {threads.length === 0 ? (
          <p>No conversations yet.</p>
        ) : (
          <div className="list-stack">
            {threads.map((thread) => {
              const other = thread.participants
                .map((p) => p.user)
                .find((p) => p?.id !== user.id);
              const lastMessage = thread.messages[0];
              return (
                <Link key={thread.id} href={`/student/messages/${thread.id}`} className="thread-card">
                  <div style={{ fontWeight: 600 }}>{other?.name ?? other?.email ?? "Conversation"}</div>
                  {lastMessage ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(lastMessage.createdAt).toLocaleString()} — {lastMessage.body}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
