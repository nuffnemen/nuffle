import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AssignmentTarget, Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function updateAssignment(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const assignmentId = formData.get("assignmentId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const dueAtValue = formData.get("dueAt") as string;
  const target = formData.get("target") as AssignmentTarget;
  const targetValue = (formData.get("targetValue") as string)?.trim();
  const pointsValue = (formData.get("pointsPossible") as string)?.trim();

  if (!assignmentId || !title) {
    redirect("/");
  }

  const targetIds =
    target === AssignmentTarget.CLASS_GROUP || target === AssignmentTarget.STUDENTS
      ? targetValue
        ? targetValue.split(",").map((v) => v.trim())
        : []
      : [];

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      title,
      description,
      dueAt: dueAtValue ? new Date(dueAtValue) : null,
      target,
      targetIds,
      pointsPossible: pointsValue ? Number(pointsValue) : null,
    },
  });

  revalidatePath("/instructor/assignments");
  revalidatePath(`/instructor/assignments/${assignmentId}`);
  revalidatePath(`/student/assignments/${assignmentId}`);
}

async function deleteAssignment(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const assignmentId = formData.get("assignmentId") as string;
  if (!assignmentId) {
    redirect("/");
  }

  await prisma.assignmentSubmission.deleteMany({ where: { assignmentId } });
  await prisma.assignment.delete({ where: { id: assignmentId } });

  revalidatePath("/instructor/assignments");
  revalidatePath("/student/assignments");
}

export default async function InstructorAssignmentsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const assignments = await prisma.assignment.findMany({
    orderBy: { dueAt: "asc" },
    include: {
      submissions: {
        where: { status: SubmissionStatus.SUBMITTED },
        select: { id: true },
      },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <h1>Assignments</h1>
        <Link href="/instructor/assignments/new" className="btn btn-primary">
          Add assignment
        </Link>
      </div>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Manage assignments</h2>
            <p style={{ margin: "6px 0 0" }}>Use the separate creation form to build new assignments.</p>
          </div>
          <Link href="/instructor/assignments/new" className="btn btn-outline">
            Create assignment
          </Link>
        </div>
      </section>

      <section>
        <h2>Active</h2>
        {assignments.length === 0 ? (
          <p>No assignments yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 16,
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <Link
                  href={`/instructor/assignments/${assignment.id}`}
                  className="btn-ghost"
                  style={{
                    alignSelf: "flex-start",
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: "var(--pink)",
                    fontSize: 13,
                    textDecoration: "underline",
                  }}
                >
                  View details
                </Link>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{assignment.title}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "TBD"}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Points: {assignment.pointsPossible ?? "TBD"}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#444", display: "flex", gap: 10 }}>
                    <span>{assignment.submissions.length} ungraded</span>
                    {assignment.submissions.length > 0 ? (
                      <span className="badge">{assignment.submissions.length}</span>
                    ) : null}
                  </div>
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Edit assignment</summary>
                  <form action={updateAssignment} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <label>
                      Title
                      <input name="title" defaultValue={assignment.title} required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" rows={3} defaultValue={assignment.description} />
                    </label>
                    <label>
                      Due at
                      <input type="datetime-local" name="dueAt" defaultValue={assignment.dueAt ? new Date(assignment.dueAt).toISOString().slice(0, 16) : ""} />
                    </label>
                    <label>
                      Target
                      <select name="target" defaultValue={assignment.target}>
                        <option value={AssignmentTarget.ALL}>All students</option>
                        <option value={AssignmentTarget.CLASS_GROUP}>Class group (comma list)</option>
                        <option value={AssignmentTarget.STUDENTS}>Specific students (IDs comma list)</option>
                      </select>
                    </label>
                    <label>
                      Target values
                      <input name="targetValue" defaultValue={assignment.targetIds.join(",")} />
                    </label>
                    <label>
                      Points possible
                      <input
                        type="number"
                        name="pointsPossible"
                        min="0"
                        step="1"
                        defaultValue={assignment.pointsPossible ?? ""}
                      />
                    </label>
                    <button type="submit" className="btn btn-primary">
                      Save changes
                    </button>
                  </form>
                </details>
                <form action={deleteAssignment} style={{ marginTop: 12 }}>
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <button type="submit" className="btn btn-outline" style={{ background: "rgba(255, 95, 162, 0.1)", borderColor: "var(--pink)", color: "var(--pink)" }}>
                    Delete assignment
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
