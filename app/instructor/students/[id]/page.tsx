import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HourStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUrl } from "@/lib/storage";
import StudentProfileForm from "./StudentProfileForm";

async function leavePortfolioFeedback(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) redirect("/");

  const itemId = formData.get("itemId") as string;
  const feedback = (formData.get("feedback") as string) || null;

  await prisma.portfolioItem.update({
    where: { id: itemId },
    data: { instructorFeedback: feedback, feedbackById: user.id },
  });

  const studentId = formData.get("studentId") as string;
  revalidatePath(`/instructor/students/${studentId}`);
}

export default async function InstructorStudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const student = await prisma.user.findUnique({ where: { id } });
  if (!student) notFound();

  const [hours, submissions, portfolio] = await Promise.all([
    prisma.hourEntry.findMany({
      where: { studentId: id },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId: id },
      include: { assignment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.portfolioItem.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals: Record<HourStatus, number> = {
    [HourStatus.APPROVED]: 0,
    [HourStatus.PENDING]: 0,
    [HourStatus.REJECTED]: 0,
  };
  hours.forEach((h) => {
    totals[h.status as HourStatus] += h.minutes;
  });

  const canEdit = user.role === Role.ADMIN || user.role === Role.HEAD_INSTRUCTOR || user.role === Role.INSTRUCTOR;

  return (
    <div className="stack">
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1>{student.name ?? student.email}</h1>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Cohort {student.classGroup ?? "—"}</div>
        {canEdit ? <StudentProfileForm student={student} canEditRole={user.role === Role.ADMIN} /> : null}
      </section>

      <section>
        <h2>Hours</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(totals).map(([status, min]) => (
            <div key={status} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
              <div style={{ fontSize: 12, color: "#777" }}>{status}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{min} min</div>
            </div>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Minutes</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                <td style={{ padding: 8 }}>{new Date(entry.date).toLocaleDateString()}</td>
                <td style={{ padding: 8 }}>{entry.minutes}</td>
                <td style={{ padding: 8 }}>{entry.status}</td>
                <td style={{ padding: 8 }}>{entry.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Assignments</h2>
        {submissions.length === 0 ? (
          <p>No submissions.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {submissions.map((submission) => (
              <div key={submission.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                <div style={{ fontWeight: 600 }}>{submission.assignment.title}</div>
                <div style={{ fontSize: 12, color: "#777" }}>Status: {submission.status}</div>
                {submission.grade ? <div>Grade: {submission.grade}</div> : null}
                {submission.feedback ? <div>Feedback: {submission.feedback}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Portfolio</h2>
        {portfolio.length === 0 ? (
          <p>No items yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {portfolio.map((item) => (
              <div key={item.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                {item.imageRef ? (
                  <Image
                    src={getPublicUrl(item.imageRef) ?? ""}
                    alt={item.caption ?? "Work sample"}
                    width={600}
                    height={400}
                    style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
                    unoptimized
                  />
                ) : null}
                {item.caption ? <div style={{ marginTop: 8 }}>{item.caption}</div> : null}
                <form
                  action={leavePortfolioFeedback}
                  style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <label>
                    Feedback
                    <textarea name="feedback" rows={2} defaultValue={item.instructorFeedback ?? ""} />
                  </label>
                  <button type="submit">Save feedback</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
