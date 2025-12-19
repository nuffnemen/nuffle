import Link from "next/link";
import { AssignmentTarget, AttendanceStatus, Prisma, Role, SubmissionStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type GradeEntry = {
  assignmentId: string;
  title: string;
  dueAt: Date | null;
  statusLabel: "Graded" | "Missing" | "Awaiting grade";
  earned: number | null;
  possible: number | null;
  includeInTotals: boolean;
  percentageLabel: string;
};

export default async function StudentGradesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

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

  const assignments = await prisma.assignment.findMany({
    where: { OR: assignmentFilters },
    orderBy: { dueAt: "asc" },
    include: {
      submissions: {
        where: { studentId: user.id },
      },
    },
  });

  const now = new Date();

  const attendanceCount = await prisma.attendance.count({
    where: {
      studentId: user.id,
      status: AttendanceStatus.PRESENT,
    },
  });

  const entries: GradeEntry[] = assignments.map((assignment) => {
    const submission = assignment.submissions[0];
    const duePassed = Boolean(assignment.dueAt && now > assignment.dueAt);
    const isGraded = submission?.status === SubmissionStatus.GRADED;
    const isMissing = duePassed && !isGraded;

    let earned: number | null = null;
    if (isGraded && submission?.grade) {
      const parsed = Number(submission.grade);
      earned = Number.isFinite(parsed) ? parsed : null;
    } else if (isMissing) {
      earned = 0;
    }
    const possible = assignment.pointsPossible ?? null;
    const includeInTotals = possible !== null && possible > 0 && (isGraded || isMissing);
    const statusLabel: GradeEntry["statusLabel"] = isGraded
      ? "Graded"
      : isMissing
        ? "Missing"
        : "Awaiting grade";
    const percentageLabel =
      earned !== null && possible !== null && possible > 0
        ? `${Math.round((earned / possible) * 100)}%`
        : statusLabel === "Missing"
          ? "0%"
          : "—";

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      statusLabel,
      earned,
      possible,
      includeInTotals,
      percentageLabel,
    };
  });

  const totals = entries.filter((entry) => entry.includeInTotals);
  const totalEarned = totals.reduce((sum, entry) => sum + (entry.earned ?? 0), 0);
  const totalPossible = totals.reduce((sum, entry) => sum + (entry.possible ?? 0), 0);
  const overallPercentage = totalPossible ? Math.round((totalEarned / totalPossible) * 100) : null;

  return (
    <div className="stack">
      <section className="card">
        <h1>Grades</h1>
        <p>See how each assignment contributes to your running score.</p>
      </section>

      <section className="card">
        {entries.length === 0 ? (
          <p>No assignments available yet.</p>
        ) : (
          <div className="list-stack" style={{ gap: 16 }}>
            {entries.map((entry) => (
              <Link
                key={entry.assignmentId}
                href={`/student/assignments/${entry.assignmentId}`}
                className="thread-card"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{entry.title}</strong>
                  <span
                    style={{
                      fontSize: 12,
                      color:
                        entry.statusLabel === "Missing"
                          ? "var(--pink)"
                          : entry.statusLabel === "Graded"
                            ? "#0f9d58"
                            : "var(--text-muted)",
                      fontWeight: entry.statusLabel === "Missing" ? 600 : 500,
                    }}
                  >
                    {entry.statusLabel}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ color: "var(--text-muted)" }}>
                    Due {entry.dueAt ? new Date(entry.dueAt).toLocaleString() : "No due date"}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {entry.possible !== null
                      ? `${entry.earned ?? (entry.statusLabel === "Missing" ? 0 : "—")} / ${entry.possible}`
                      : entry.earned !== null
                        ? `${entry.earned}`
                        : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gold)" }}>{entry.percentageLabel}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Running total</h2>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <strong>Total earned</strong>
            <div>{totalEarned} pts</div>
          </div>
          <div>
            <strong>Total possible</strong>
            <div>{totalPossible} pts</div>
          </div>
          <div>
            <strong>Overall %</strong>
            <div>{overallPercentage !== null ? `${overallPercentage}%` : "N/A"}</div>
          </div>
          <div>
            <strong>Attendances</strong>
            <div>{attendanceCount} present</div>
          </div>
        </div>
      </section>
    </div>
  );
}
