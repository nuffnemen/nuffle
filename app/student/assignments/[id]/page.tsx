import Image from "next/image";
import { AssignmentTarget, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUrl } from "@/lib/storage";
import SubmissionForm from "@/app/student/assignments/SubmissionForm";

export const dynamic = "force-dynamic";

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      submissions: {
        where: { studentId: user.id },
      },
    },
  });

  if (!assignment) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Assignment not found</h1>
          <p>The selected assignment could not be located.</p>
        </section>
      </div>
    );
  }

  const submission = assignment.submissions[0];
  const canSubmit = !submission || submission.canResubmit;

  const classMatch = user.classGroup ? assignment.targetIds.includes(user.classGroup) : false;
  const hasAccess =
    assignment.target === AssignmentTarget.ALL ||
    (assignment.target === AssignmentTarget.CLASS_GROUP && classMatch) ||
    (assignment.target === AssignmentTarget.STUDENTS && assignment.targetIds.includes(user.id));
  if (!hasAccess) {
    return (
      <div>
        <h1>{assignment.title}</h1>
        <p>You are not part of the target audience for this assignment.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1>{assignment.title}</h1>
        <p style={{ whiteSpace: "pre-line" }}>{assignment.description}</p>
        <p style={{ color: "var(--text-muted)" }}>
          Points possible: {assignment.pointsPossible ?? "Not set"}
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "TBD"}
        </p>

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

      <section className="card">
        <h2>My submission</h2>
        {submission ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 16,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <strong>Status:</strong> {submission.status}
            </div>
            <div>
              <strong>Grade:</strong> {submission.grade ?? "Awaiting score"}
            </div>
            {submission.feedback ? (
              <div>
                <strong>Feedback:</strong>
                <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>{submission.feedback}</p>
              </div>
            ) : null}
            {submission.textAnswer ? (
              <div>
                <strong>Submitted text</strong>
                <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>{submission.textAnswer}</p>
              </div>
            ) : null}
            {submission.attachmentRefs.length ? (
              <div>
                <strong>Attachments</strong>
                <ul>
                  {submission.attachmentRefs.map((ref) => (
                    <li key={ref}>
                      <a href={getPublicUrl(ref) ?? "#"} target="_blank">
                        {ref.split("/").pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Updated {new Date(submission.updatedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <p>No submission yet.</p>
        )}
        <SubmissionForm
          assignmentId={assignment.id}
          existingText={submission?.textAnswer}
          canSubmit={canSubmit}
          resubmissionRequested={submission?.resubmissionRequested ?? false}
        />
      </section>
    </div>
  );
}
