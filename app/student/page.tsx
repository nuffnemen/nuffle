import Link from "next/link";
import { AnnouncementAudience, AssignmentTarget, HourStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fmtMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return null;
  }

  const assignmentFilters: Prisma.AssignmentWhereInput[] = [
    { target: AssignmentTarget.ALL },
    { target: AssignmentTarget.STUDENTS, targetIds: { has: user.id } },
  ];
  if (user.classGroup) {
    assignmentFilters.push({
      target: AssignmentTarget.CLASS_GROUP,
      targetIds: { has: user.classGroup },
    });
  }

  const [hourTotals, recentEntries, assignments, announcements] = await Promise.all([
    prisma.hourEntry.groupBy({
      by: ["status"],
      _sum: { minutes: true },
      where: { studentId: user.id },
    }),
    prisma.hourEntry.findMany({
      where: { studentId: user.id },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.assignment.findMany({
      where: {
        OR: assignmentFilters,
      },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: {
        submissions: {
          where: { studentId: user.id },
          select: { status: true },
        },
      },
    }),
    prisma.announcement.findMany({
      where: {
        OR: [
          { audience: AnnouncementAudience.ALL },
          ...(user.classGroup
            ? [
                {
                  audience: AnnouncementAudience.CLASS_GROUP,
                  audienceClassGroups: { has: user.classGroup },
                },
              ]
            : []),
          { audience: AnnouncementAudience.ROLE, audienceRoles: { has: Role.STUDENT } },
          { audience: AnnouncementAudience.INDIVIDUAL, audienceIndividualIds: { has: user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const totals: Record<HourStatus, number> = {
    [HourStatus.APPROVED]: 0,
    [HourStatus.PENDING]: 0,
    [HourStatus.REJECTED]: 0,
  };

  hourTotals.forEach((row) => {
    totals[row.status as HourStatus] = row._sum.minutes ?? 0;
  });

  return (
    <div className="stack">
      <section className="card" style={{ gap: 12, display: "flex", flexDirection: "column" }}>
        <p>Welcome back</p>
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>{user.name ?? user.email}</h1>
        <p>Track your progress, hours, assignments, and communications in one place.</p>

        <div className="stat-grid" style={{ marginTop: 12 }}>
          {[
            { label: "Approved", value: totals.APPROVED },
            { label: "Pending", value: totals.PENDING },
            { label: "Rejected", value: totals.REJECTED },
          ].map((card) => (
            <div key={card.label} className="stat-card">
              <span>{card.label}</span>
              <strong>{fmtMinutes(card.value)}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {[
            { href: "/student/hours", label: "Hours & Clock" },
            { href: "/student/assignments", label: "Assignments" },
            { href: "/student/messages", label: "Messages" },
            { href: "/student/portfolio", label: "Portfolio" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="btn btn-ghost">
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>Upcoming assignments</h2>
          <Link href="/student/assignments" className="btn btn-outline">
            View all
          </Link>
        </div>
        {assignments.length === 0 ? (
          <p>Nothing due soon.</p>
        ) : (
          <div className="list-stack">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/student/assignments/${assignment.id}`}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                }}
              >
                <div>
                  <strong>{assignment.title}</strong>
                  <p>Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleDateString() : "TBD"}</p>
                </div>
                <span style={{ color: "var(--pink)", fontWeight: 600 }}>
                  {assignment.submissions[0]?.status ?? "Not submitted"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Recent hours</h2>
        {recentEntries.length === 0 ? (
          <p>
            No hours yet. <Link href="/student/hours">Log your first entry.</Link>
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Minutes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{fmtMinutes(entry.minutes)}</td>
                  <td>{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Announcements</h2>
        {announcements.length === 0 ? (
          <p>No announcements.</p>
        ) : (
          <div className="list-stack">
            {announcements.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
                <strong>{a.title}</strong>
                <p style={{ margin: "8px 0" }}>{a.body}</p>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
