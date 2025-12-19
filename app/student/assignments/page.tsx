import Link from "next/link";
import { AssignmentTarget, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
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
    where: {
      OR: assignmentFilters,
    },
    orderBy: { dueAt: "asc" },
    include: {
      submissions: {
        where: { studentId: user.id },
      },
    },
  });

  return (
    <div className="stack">
      <section className="card">
        <h1>Assignments</h1>
        <p>Upcoming and active work. Tap any card to open and submit.</p>
      </section>

      <section className="card">
        {assignments.length === 0 ? (
          <p>No assignments yet.</p>
        ) : (
          <div className="list-stack">
            {assignments.map((assignment) => {
              const submission = assignment.submissions[0];
              return (
                <Link
                  key={assignment.id}
                  href={`/student/assignments/${assignment.id}`}
                  className="btn-outline"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    borderRadius: "var(--radius)",
                    padding: 16,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{assignment.title}</strong>
                    <p style={{ margin: "6px 0" }}>
                      Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "TBD"}
                    </p>
                    <p style={{ margin: "2px 0" }}>
                      Status: {submission ? submission.status : "Not submitted"}
                    </p>
                    <p style={{ margin: "2px 0", color: "var(--text-muted)" }}>
                      Grade:{" "}
                      {assignment.pointsPossible
                        ? submission
                          ? `${submission.grade ?? "—"} / ${assignment.pointsPossible}`
                          : `— / ${assignment.pointsPossible}`
                        : submission
                          ? submission.grade ?? "Awaiting score"
                          : "Awaiting score"}
                    </p>
                  </div>
                  <span style={{ color: "var(--pink)", fontWeight: 600 }}>
                    {submission ? "View submission" : "Start"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
