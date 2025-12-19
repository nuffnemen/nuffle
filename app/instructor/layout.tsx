import { Role } from "@prisma/client";
import Nav from "@/app/components/Nav";
import { requireRoles } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";

const baseNavItems = [
  { href: "/instructor", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/instructor/attendance", label: "Attendance" },
  { href: "/instructor/hours", label: "Hours" },
  { href: "/instructor/assignments", label: "Assignments" },
  { href: "/instructor/messages", label: "Messages" },
  { href: "/instructor/announcements", label: "Announcements" },
  { href: "/instructor/curriculum", label: "Curriculum" },
  { href: "/ai", label: "NUFF AI" },
  { href: "/instructor/students", label: "Students" },
];

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoles([Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR, Role.ADMIN]);
  const { total, message } = await getNotificationSummary(user.id);
  const extraNavItems = [];
  if (user.role === Role.ADMIN) {
    extraNavItems.push({ href: "/admin", label: "Admin Dashboard" });
  }
  if (user.role === Role.ADMIN || user.role === Role.HEAD_INSTRUCTOR) {
    extraNavItems.push({ href: "/head", label: "Head Instructor View" });
  }
  const navItems = [...baseNavItems, ...extraNavItems];

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
