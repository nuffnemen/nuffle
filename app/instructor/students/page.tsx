import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function InstructorStudentsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;

  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    orderBy: { name: "asc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1>Students</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {students.map((student) => (
          <Link
            key={student.id}
            href={`/instructor/students/${student.id}`}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 16,
              background: "white",
              textDecoration: "none",
              color: "#111",
            }}
          >
            <div style={{ fontWeight: 600 }}>{student.name ?? student.email}</div>
            <div style={{ fontSize: 12, color: "#777" }}>Cohort {student.classGroup ?? "—"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
