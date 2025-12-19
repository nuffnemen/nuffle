import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyHourStatusChange } from "@/lib/notifications";
import ManualAddForm from "./ManualAddForm";

async function updateHourStatus(hourId: string, status: "APPROVED" | "REJECTED") {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const updated = await prisma.hourEntry.update({
    where: { id: hourId },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await notifyHourStatusChange(
    updated.studentId,
    user.name ?? user.email,
    status,
    updated.minutes,
  );

  revalidatePath("/instructor/hours");
  revalidatePath("/student");
}

export default async function InstructorHoursPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const [entries, students] = await Promise.all([
    prisma.hourEntry.findMany({
      include: {
        student: true,
        createdBy: true,
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { role: Role.STUDENT },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="stack">
      <section className="card">
        <h1>Hours approvals</h1>
        <p>Click &ldquo;Manually add hours&rdquo; to log time for a student and auto-approve it.</p>
        <ManualAddForm students={students} defaultDate={new Date().toISOString().substring(0, 10)} />
      </section>

      <section className="card">
        <h2>Recent entries</h2>
        <div className="list-stack">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`hours-entry-card hours-entry-card--${entry.status.toLowerCase()}`}
            >
              <div className="hours-entry-card__header">
                <div>
                  <strong>{entry.student.name ?? entry.student.email}</strong>
                  <span className="hours-entry-card__timestamp">
                    {new Date(entry.date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="hours-entry-card__minutes">{entry.minutes} minutes</span>
                  <span className="hours-entry-card__status">{entry.status}</span>
                </div>
              </div>
              {entry.notes ? (
                <div className="hours-entry-card__notes">{entry.notes}</div>
              ) : (
                <div className="hours-entry-card__notes hours-entry-card__notes--empty">
                  No notes provided.
                </div>
              )}
              <div className="hours-entry-card__footer">
                Logged by {entry.createdBy?.name ?? entry.createdBy?.email ?? "student"}
              </div>

              {entry.status === "PENDING" ? (
                <div className="hours-entry-card__actions">
                  <form
                    action={async () => {
                      "use server";
                      await updateHourStatus(entry.id, "APPROVED");
                    }}
                  >
                    <button type="submit" className="btn btn-primary">
                      Approve
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await updateHourStatus(entry.id, "REJECTED");
                    }}
                  >
                    <button type="submit" className="btn btn-outline">
                      Reject
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
