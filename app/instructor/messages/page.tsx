import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewThreadForm from "@/app/components/messages/NewThreadForm";

export default async function InstructorMessagesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const [threads, contacts] = await Promise.all([
    prisma.thread.findMany({
      where: { participants: { some: { userId: user.id } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.user.findMany({
      where: { id: { not: user.id } },
      orderBy: { name: "asc" },
    }),
  ]);

  const options = contacts.map((contact) => ({
    id: contact.id,
    label: `${contact.name ?? contact.email} (${contact.role})`,
  }));

  return (
    <div className="stack">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        <section className="card">
          <h1>Start a conversation</h1>
          <p>Pick someone below and we will open a thread for you—no text boxes, just click and go.</p>
          <NewThreadForm options={options} redirectBase="/instructor/messages" />
        </section>
        <section className="card">
          <h2>Threads</h2>
          {threads.length === 0 ? (
            <p>No conversations yet.</p>
          ) : (
            <div className="list-stack">
              {threads.map((thread) => {
                const otherNames = thread.participants
                  .filter((p) => p.userId !== user.id)
                  .map((p) => p.user?.name ?? p.user?.email ?? "Unknown")
                  .join(", ");
                const last = thread.messages[0];
                return (
                  <Link key={thread.id} href={`/instructor/messages/${thread.id}`} className="thread-card">
                    <div style={{ fontWeight: 600 }}>{otherNames}</div>
                    {last ? (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {last.body} · {new Date(last.createdAt).toLocaleString()}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
