import Link from "next/link";
import { Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function HeadDashboard() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const [tasks, pendingHours, pendingSubmissions, instructorCount] = await Promise.all([
    prisma.instructorTask.findMany({
      orderBy: { createdAt: "desc" },
      include: { assignee: true },
      take: 6,
    }),
    prisma.hourEntry.count({ where: { status: "PENDING" } }),
    prisma.assignmentSubmission.count({ where: { status: SubmissionStatus.SUBMITTED } }),
    prisma.user.count({ where: { role: { in: [Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR] } } }),
  ]);

  return (
    <div className="stack">
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p>Head Instructor</p>
          <h1>Operational overview</h1>
        </div>
        <div className="stat-grid">
          {[
            { label: "Pending hours", value: pendingHours, href: "/instructor/hours" },
            { label: "Submissions to grade", value: pendingSubmissions, href: "/instructor/assignments" },
            { label: "Instructors", value: instructorCount, href: "/head/instructors" },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              style={{ textDecoration: "none", color: "var(--text-primary)" }}
            >
              <div className="stat-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/head/instructors" className="btn btn-primary">
            Manage instructor tasks
          </Link>
          <Link href="/instructor" className="btn btn-outline">
            Instructor tools
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Latest tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <div className="list-stack">
            {tasks.map((task) => (
              <div key={task.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
                <strong>{task.title}</strong>
                {task.description ? <p style={{ margin: "6px 0" }}>{task.description}</p> : null}
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Status: {task.status} · Assignee: {task.assignee?.name ?? "Unassigned"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
