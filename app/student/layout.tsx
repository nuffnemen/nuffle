import { Role } from "@prisma/client";
import Nav from "@/app/components/Nav";
import { requireRoles } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";

const navItems = [
  { href: "/student", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/student/hours", label: "Hours" },
  { href: "/student/assignments", label: "Assignments" },
  { href: "/student/grades", label: "Grades" },
  { href: "/student/messages", label: "Messages" },
  { href: "/student/curriculum", label: "Curriculum" },
  { href: "/ai", label: "NUFF AI" },
  { href: "/student/portfolio", label: "Portfolio" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoles([Role.STUDENT]);
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
