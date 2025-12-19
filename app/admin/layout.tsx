import { Role } from "@prisma/client";
import Nav from "@/app/components/Nav";
import { requireRoles } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/ai", label: "NUFF AI" },
  { href: "/instructor/messages", label: "Messages" },
  { href: "/instructor", label: "Instructor View" },
  { href: "/head", label: "Head Instructor View" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoles([Role.ADMIN]);
  const { total, message } = await getNotificationSummary(user.id);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav
        role={user.role}
        userName={user.name ?? user.email}
        items={navItems}
        notificationCount={total}
        messageNotificationCount={message}
      />
      <main className="page-shell">{children}</main>
    </div>
  );
}
