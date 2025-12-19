import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUrl } from "@/lib/storage";
import { markNotificationsForAssignment } from "@/lib/notifications";

async function gradeSubmission(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const submissionId = formData.get("submissionId") as string;
  const assignmentId = formData.get("assignmentId") as string;
  const grade = (formData.get("grade") as string) || null;
  const feedback = (formData.get("feedback") as string) || null;

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true },
  });
  const hasFeedback = Boolean((grade && grade.trim()) || (feedback && feedback.trim()));
  const finalStatus = hasFeedback ? SubmissionStatus.GRADED : existing?.status ?? SubmissionStatus.SUBMITTED;

  const updatedSubmission = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      status: finalStatus,
      grade,
      feedback,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await markNotificationsForAssignment(assignmentId, updatedSubmission.studentId);

  revalidatePath(`/instructor/assignments/${assignmentId}`);
  revalidatePath(`/student/assignments/${assignmentId}`);
  revalidatePath("/instructor/assignments");
}

async function toggleSubmissionWindow(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const submissionId = formData.get("submissionId") as string;
  const assignmentId = formData.get("assignmentId") as string;
  const mode = formData.get("mode") as string;
  if (!submissionId || !assignmentId || (mode !== "allow" && mode !== "lock" && mode !== "dismiss")) {
    redirect("/");
  }

  const data =
    mode === "allow"
      ? { canResubmit: true, resubmissionRequested: false }
      : mode === "lock"
        ? { canResubmit: false, resubmissionRequested: false }
        : { resubmissionRequested: false };

  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data,
  });

  revalidatePath(`/instructor/assignments/${assignmentId}`);
  revalidatePath(`/student/assignments/${assignmentId}`);
}

export default async function InstructorAssignmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      submissions: {
        include: { student: true },
      },
    },
  });
  if (!assignment) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <h1>{assignment.title}</h1>
        <p style={{ whiteSpace: "pre-line", color: "#444" }}>{assignment.description}</p>
        <div style={{ fontSize: 12, color: "#666" }}>
          Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "TBD"}
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>
          Points possible: {assignment.pointsPossible ?? "Not set"}
        </div>

        {assignment.attachments.length ? (
          <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Attachments ({assignment.attachments.length})</strong>
              <div style={{ display: "flex", gap: 8 }}>
                {assignment.attachments.map((ref) => {
                  const url = getPublicUrl(ref) ?? ref;
                  return (
                    <a
                      key={`${ref}-link`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(5,5,5,0.05)",
                        border: "1px solid rgba(5,5,5,0.08)",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      {ref.split("/").pop()}
                    </a>
                  );
                })}
              </div>
            </div>
            <details style={{ marginTop: 12 }} open>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Preview attachments</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                {assignment.attachments.map((ref) => {
                  const url = getPublicUrl(ref) ?? ref;
                  const isPdf = url.toLowerCase().endsWith(".pdf");
                  const isImage = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url);
                  return (
                    <div key={ref} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{ref.split("/").pop()}</span>
                        <a href={url} target="_blank" rel="noreferrer">
                          Open in new tab
                        </a>
                      </div>
                      {isPdf ? (
                        <iframe
                          src={url}
                          title="attachment"
                          style={{ width: "100%", height: 360, marginTop: 8, borderRadius: 8, border: "1px solid rgba(5,5,5,0.1)" }}
                        />
                      ) : isImage ? (
                        <div style={{ position: "relative", width: "100%", height: 360, marginTop: 8 }}>
                          <Image
                            src={url}
                            alt={ref.split("/").pop() ?? "Attachment"}
                            fill
                            sizes="(max-width: 768px) 100vw, 728px"
                            style={{ objectFit: "contain", borderRadius: 8 }}
                            unoptimized
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        ) : null}
      </section>

      <section>
        <h2>Submissions</h2>
        {assignment.submissions.length === 0 ? (
          <p>No submissions yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assignment.submissions.map((submission) => {
              const gradeDisplay = assignment.pointsPossible
                ? `${submission.grade ?? "—"} / ${assignment.pointsPossible}`
                : submission.grade ?? "Awaiting score";
              return (
                <div key={submission.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                  <div style={{ fontWeight: 600 }}>
                    {submission.student.name ?? submission.student.email} · {submission.status}
                  </div>
                {submission.textAnswer ? (
                  <p style={{ whiteSpace: "pre-line" }}>{submission.textAnswer}</p>
                ) : (
                  <p style={{ color: "#777" }}>No written response.</p>
                )}
                {submission.attachmentRefs.length ? (
                  <ul>
                    {submission.attachmentRefs.map((ref) => (
                      <li key={ref}>
                        <a href={getPublicUrl(ref) ?? "#"} target="_blank">
                          {ref.split("/").pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div style={{ marginTop: 12 }}>
                  <div>
                    <strong>Status:</strong> {submission.status}
                  </div>
                  <div>
                    <strong>Grade:</strong> {gradeDisplay}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {submission.resubmissionRequested ? (
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--pink)", color: "black", fontSize: 12 }}>
                      Resubmission requested
                    </span>
                  ) : null}
                  {submission.canResubmit ? (
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--gold)", color: "black", fontSize: 12 }}>
                      Submission window open
                    </span>
                  ) : null}
                </div>

                <form action={toggleSubmissionWindow} style={{ marginTop: 12 }}>
                  <input type="hidden" name="submissionId" value={submission.id} />
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <input type="hidden" name="mode" value={submission.canResubmit ? "lock" : "allow"} />
                  <button type="submit" className="btn btn-outline">
                    {submission.canResubmit ? "Close submission window" : "Allow resubmission"}
                  </button>
                </form>
                {submission.resubmissionRequested && !submission.canResubmit ? (
                  <form action={toggleSubmissionWindow} style={{ marginTop: 8 }}>
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <input type="hidden" name="mode" value="dismiss" />
                    <button type="submit" className="btn" style={{ background: "transparent", border: "1px dashed var(--border)" }}>
                      Dismiss request
                    </button>
                  </form>
                ) : null}

                <details style={{ marginTop: 12, border: "1px solid rgba(5,5,5,0.08)", borderRadius: 12, padding: 12 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Edit grade / feedback</summary>
                  <form action={gradeSubmission} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <label>
                      Grade
                      <input name="grade" defaultValue={submission.grade ?? ""} />
                    </label>
                    <label>
                      Feedback
                      <textarea name="feedback" rows={3} defaultValue={submission.feedback ?? ""} />
                    </label>
                    <button type="submit">Save</button>
                  </form>
                </details>
              </div>
            );
          })}
          </div>
        )}
      </section>
    </div>
  );
}
