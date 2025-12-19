import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, dashboardPathForRole } from "@/lib/auth";
import AIAssistant from "@/app/components/AIAssistant";

export default async function AITutorPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.STUDENT && user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const [assignments, materials] = await Promise.all([
    prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.curriculumMaterial.findMany({
      where: {
        OR: [
          { visibleToRoles: { isEmpty: true } },
          { visibleToRoles: { has: user.role } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const assignmentSummaries = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description ?? null,
    dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
    pointsPossible: assignment.pointsPossible ?? null,
  }));

  const materialSummaries = materials.map((material) => ({
    id: material.id,
    title: material.title,
    description: material.description ?? null,
    materialType: material.materialType,
  }));

  const backHref = dashboardPathForRole(user.role);
  return (
    <div className="stack">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1>NUFF AI</h1>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              NUFF can help students with assignments and instructors with lesson planning using only the curriculum and materials already on Cambria.
            </p>
          </div>
          <Link href={backHref} className="btn btn-outline">
            Back to dashboard
          </Link>
        </div>
        <div style={{ marginTop: 16 }}>
          <AIAssistant assignments={assignmentSummaries} materials={materialSummaries} />
        </div>
      </section>
    </div>
  );
}
