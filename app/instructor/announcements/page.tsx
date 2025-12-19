import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AnnouncementAudience, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyAnnouncement } from "@/lib/notifications";

async function createAnnouncement(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) redirect("/");

  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const audience = formData.get("audience") as AnnouncementAudience;
  const value = (formData.get("audienceValue") as string)?.trim();

  if (!title || !body) throw new Error("Missing fields");

  const valueList = value ? value.split(",").map((v) => v.trim()) : [];

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body,
      audience,
      audienceClassGroups: audience === AnnouncementAudience.CLASS_GROUP ? valueList : [],
      audienceRoles: audience === AnnouncementAudience.ROLE ? valueList : [],
      audienceIndividualIds: audience === AnnouncementAudience.INDIVIDUAL ? valueList : [],
      createdById: user.id,
    },
  });

  await notifyAnnouncement(announcement);
  revalidatePath("/student");
  revalidatePath("/instructor/announcements");
}

export default async function InstructorAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1>Announcements</h1>
            <p style={{ marginTop: 4, color: "var(--text-muted)" }}>Notify instructors and students when it matters.</p>
          </div>
          <details style={{ marginLeft: "auto", maxWidth: 360 }}>
            <summary className="btn btn-primary" style={{ cursor: "pointer" }}>
              Write announcement
            </summary>
            <form action={createAnnouncement} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Body
                <textarea name="body" rows={4} required />
              </label>
              <label>
                Audience
                <select name="audience" defaultValue={AnnouncementAudience.ALL}>
                  <option value={AnnouncementAudience.ALL}>Entire school</option>
                  <option value={AnnouncementAudience.CLASS_GROUP}>Class group(s)</option>
                  <option value={AnnouncementAudience.ROLE}>Role(s)</option>
                  <option value={AnnouncementAudience.INDIVIDUAL}>Specific user IDs</option>
                </select>
              </label>
              <label>
                Audience values
                <input name="audienceValue" placeholder="Comma separated (e.g. 2025A or STUDENT,INSTRUCTOR)" />
              </label>
              <button type="submit">Send</button>
            </form>
          </details>
        </div>
        <div style={{ marginTop: 24 }}>
          <h2>History</h2>
          {announcements.length === 0 ? (
            <p>No announcements.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {announcements.map((announcement) => (
                <div key={announcement.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                  <div style={{ fontWeight: 600 }}>{announcement.title}</div>
                  <p>{announcement.body}</p>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {announcement.audience} — {announcement.createdBy?.name ?? announcement.createdBy?.email} —{" "}
                    {new Date(announcement.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
