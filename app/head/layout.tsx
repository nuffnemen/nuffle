import { Role } from "@prisma/client";
import Nav from "@/app/components/Nav";
import { requireRoles } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";

const baseNavItems = [
  { href: "/head", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/head/instructors", label: "Instructor Tasks" },
  { href: "/instructor", label: "Instructor Tools" },
  { href: "/instructor/attendance", label: "Attendance" },
  { href: "/ai", label: "NUFF AI" },
];

export default async function HeadLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoles([Role.HEAD_INSTRUCTOR, Role.ADMIN]);
  const { total, message } = await getNotificationSummary(user.id);
  const navItems = [...baseNavItems];
  if (user.role === Role.ADMIN) {
    navItems.push({ href: "/admin", label: "Admin Dashboard" });
  }

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
