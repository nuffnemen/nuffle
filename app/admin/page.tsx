import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) return null;

  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  const byRole: Record<Role, number> = {
    ADMIN: 0,
    HEAD_INSTRUCTOR: 0,
    INSTRUCTOR: 0,
    STUDENT: 0,
  };
  counts.forEach((row) => {
    const role = row.role as Role;
    byRole[role] = row._count.role;
  });

  return (
    <div className="stack">
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>System Overview</p>
        <h1>Admin Dashboard</h1>
        <div className="stat-grid">
          {Object.entries(byRole).map(([role, count]) => (
            <div key={role} className="stat-card">
              <span>{role}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/settings" className="btn btn-primary">
          Open settings
        </Link>
        <Link href="/instructor" className="btn btn-outline">
          View as instructor
        </Link>
      </section>
    </div>
  );
}
