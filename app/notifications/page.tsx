import { NotificationType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationsForUser, markNotificationsRead } from "@/lib/notifications";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function markAllNotificationsRead(_formData: FormData) {
  "use server";
  void _formData;
  const user = await getCurrentUser();
  if (!user) return;
  await markNotificationsRead(user.id);
  revalidatePath("/notifications");
}

const typeLabels: Record<NotificationType, string> = {
  [NotificationType.ANNOUNCEMENT]: "Announcement",
  [NotificationType.ASSIGNMENT_POSTED]: "Assignment",
  [NotificationType.ASSIGNMENT_SUBMITTED]: "Submission",
  [NotificationType.MESSAGE]: "Message",
  [NotificationType.HOUR_LOGGED]: "Hour log",
  [NotificationType.HOUR_APPROVED]: "Hours approved",
  [NotificationType.HOUR_REJECTED]: "Hours rejected",
};

const destinationFor = (id: string) => `/notifications/open/${id}`;

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await getNotificationsForUser(user.id);
  const unread = notifications.filter((n) => !n.isRead);
  const opened = notifications.filter((n) => n.isRead);

  const unreadCount = unread.length;
  const messageCount = unread.filter((n) => n.type === NotificationType.MESSAGE).length;

  function renderCard(notification: typeof notifications[number]) {
    return (
      <Link
        key={notification.id}
        href={destinationFor(notification.id)}
        className={`notification-card${notification.isRead ? " read" : " unread"}`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{typeLabels[notification.type]}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date(notification.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div>{notification.title}</div>
          {notification.body ? (
            <p style={{ marginTop: 4, color: "var(--text-muted)", lineHeight: 1.4 }}>{notification.body}</p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <div className="stack">
      <section className="card notification-hero">
        <div>
          <h1 style={{ fontSize: 32 }}>Notifications</h1>
          <p style={{ marginTop: 6 }}>
            {unreadCount === 0
              ? "You’re all caught up."
              : `${unreadCount} unread item${unreadCount === 1 ? "" : "s"} (` +
                `${messageCount} message${messageCount === 1 ? "" : "s"})`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <form action={markAllNotificationsRead}>
            <button type="submit" className="btn btn-primary">
              Mark all read
            </button>
          </form>
          <Link href="/me" className="btn btn-outline">
            Back to dashboard
          </Link>
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.4)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {unreadCount} unread · {opened.length} opened
          </div>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Unread</h2>
          {unreadCount === 0 ? <p style={{ color: "var(--text-muted)" }}>No new alerts.</p> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {unread.map((notification) => renderCard(notification))}
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>Opened</h2>
          {opened.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No opened notifications yet.</p> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {opened.map((notification) => renderCard(notification))}
        </div>
      </section>
    </div>
  );
}
