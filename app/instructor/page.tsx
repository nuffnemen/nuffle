import Link from "next/link";
import { Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InstructorDashboard() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const [pendingHours, pendingSubmissions, tasks, recentAnnouncements] = await prisma.$transaction([
    prisma.hourEntry.count({ where: { status: "PENDING" } }),
    prisma.assignmentSubmission.count({ where: { status: SubmissionStatus.SUBMITTED } }),
    prisma.instructorTask.findMany({
      where: { OR: [{ assigneeId: user.id }, { assigneeId: null }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div className="stack">
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p>Instructor Console</p>
        <h1>Operate the academy</h1>
        <div className="stat-grid">
          {[
            { label: "Pending Hours", value: pendingHours, link: "/instructor/hours" },
            { label: "Submissions to Grade", value: pendingSubmissions, link: "/instructor/assignments" },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.link}
              style={{
                textDecoration: "none",
                color: "var(--text-primary)",
              }}
            >
              <div className="stat-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Tasks</h2>
          <Link href="/head/instructors" className="btn btn-outline">
            Manage tasks
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p>No tasks assigned.</p>
        ) : (
          <div className="list-stack">
            {tasks.map((task) => (
              <div key={task.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
                <strong>{task.title}</strong>
                {task.description ? <p style={{ margin: "6px 0" }}>{task.description}</p> : null}
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Status: {task.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Latest announcements</h2>
        {recentAnnouncements.length === 0 ? (
          <p>No announcements.</p>
        ) : (
          <div className="list-stack">
            {recentAnnouncements.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
                <strong>{a.title}</strong>
                <p style={{ margin: "6px 0" }}>{a.body}</p>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
