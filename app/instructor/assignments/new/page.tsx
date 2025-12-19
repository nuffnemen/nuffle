import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AssignmentTarget, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { notifyAssignmentPosted } from "@/lib/notifications";

async function createAssignment(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    redirect("/");
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const dueAtValue = formData.get("dueAt") as string;
  const target = formData.get("target") as AssignmentTarget;
  const targetValue = (formData.get("targetValue") as string)?.trim();
  const pointsValue = (formData.get("pointsPossible") as string)?.trim();
  const attachments = formData.getAll("attachments") as File[];

  if (!title) throw new Error("Missing title");

  const targetIds =
    target === AssignmentTarget.CLASS_GROUP || target === AssignmentTarget.STUDENTS
      ? targetValue
        ? targetValue.split(",").map((v) => v.trim())
        : []
      : [];

  const attachmentRefs: string[] = [];
  for (const file of attachments) {
    if (file && file.size > 0) {
      const ref = await uploadFile(file);
      if (ref) attachmentRefs.push(ref);
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      dueAt: dueAtValue ? new Date(dueAtValue) : null,
      target,
      targetIds,
      attachments: attachmentRefs,
      pointsPossible: pointsValue ? Number(pointsValue) : null,
      createdById: user.id,
    },
  });

  await notifyAssignmentPosted(assignment);
  revalidatePath("/instructor/assignments");
  redirect("/instructor/assignments");
}

export default async function InstructorAssignmentNewPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  return (
    <div className="stack">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>New assignment</h1>
            <p>Create a new assignment for your group or individual students.</p>
          </div>
          <Link href="/instructor/assignments" className="btn btn-outline">
            Back to assignments
          </Link>
        </div>
        <form action={createAssignment} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Description
            <textarea name="description" rows={4} />
          </label>
          <label>
            Due at
            <input type="datetime-local" name="dueAt" />
          </label>
          <label>
            Target
            <select name="target" defaultValue={AssignmentTarget.ALL}>
              <option value={AssignmentTarget.ALL}>All students</option>
              <option value={AssignmentTarget.CLASS_GROUP}>Class group (comma list)</option>
              <option value={AssignmentTarget.STUDENTS}>Specific students (IDs comma list)</option>
            </select>
          </label>
          <label>
            Target values
            <input name="targetValue" placeholder="Example: 2025A or studentId1,studentId2" />
          </label>
          <label>
            Attachments
            <input type="file" name="attachments" multiple />
          </label>
          <label>
            Points possible
            <input type="number" name="pointsPossible" min="0" step="1" placeholder="e.g. 100" />
          </label>
          <button type="submit" className="btn btn-primary">
            Create assignment
          </button>
        </form>
      </section>
    </div>
  );
}
