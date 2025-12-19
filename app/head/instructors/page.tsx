import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function createTask(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) redirect("/");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const assigneeId = (formData.get("assigneeId") as string) || null;

  if (!title) throw new Error("Missing title");

  await prisma.instructorTask.create({
    data: {
      title,
      description,
      creatorId: user.id,
      assigneeId: assigneeId || null,
    },
  });

  revalidatePath("/head/instructors");
}

async function updateTask(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) redirect("/");

  const id = formData.get("taskId") as string;
  const status = (formData.get("status") as string) || undefined;
  const assigneeId = (formData.get("assigneeId") as string) || null;

  await prisma.instructorTask.update({
    where: { id },
    data: { status, assigneeId: assigneeId || null },
  });

  revalidatePath("/head/instructors");
}

export default async function HeadInstructorTasksPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const [tasks, instructors] = await Promise.all([
    prisma.instructorTask.findMany({
      orderBy: { createdAt: "desc" },
      include: { assignee: true },
    }),
    prisma.user.findMany({
      where: { role: { in: [Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1>Instructor Tasks</h1>
            <p style={{ marginTop: 4, color: "var(--text-muted)" }}>Track and assign work to instructors.</p>
          </div>
          <details style={{ marginLeft: "auto", maxWidth: 320 }}>
            <summary className="btn btn-outline" style={{ cursor: "pointer" }}>
              Write task
            </summary>
            <form action={createTask} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Description
                <textarea name="description" rows={3} />
              </label>
              <label>
                Assign to
                <select name="assigneeId" defaultValue="">
                  <option value="">Unassigned</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name ?? inst.email}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Create</button>
            </form>
          </details>
        </div>
        <div style={{ marginTop: 24 }}>
          <h2>Tasks</h2>
          {tasks.length === 0 ? (
            <p>No tasks tracked yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasks.map((task) => (
                <div key={task.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                  <div style={{ fontWeight: 600 }}>{task.title}</div>
                  {task.description ? <p>{task.description}</p> : null}
                  <form action={updateTask} style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <label>
                      Status
                      <select name="status" defaultValue={task.status}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    <label>
                      Assignee
                      <select name="assigneeId" defaultValue={task.assigneeId ?? ""}>
                        <option value="">Unassigned</option>
                        {instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name ?? inst.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">Update</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
