import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUrl } from "@/lib/storage";

export default async function StudentCurriculumPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

  const materials = await prisma.curriculumMaterial.findMany({
    where: {
      OR: [
        { visibleToRoles: { isEmpty: true } },
        { visibleToRoles: { has: "STUDENT" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = materials.reduce<Record<string, typeof materials>>((acc, material) => {
    acc[material.materialType] = acc[material.materialType] ?? [];
    acc[material.materialType].push(material);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1>Curriculum Library</h1>
        <p style={{ color: "#555" }}>Handouts, textbooks, and teaching materials shared with you.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p>No materials available yet.</p>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <section key={type}>
            <h2>{type.replace("_", " ")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {items.map((item) => (
                <a
                  key={item.id}
                  href={getPublicUrl(item.fileRef) ?? "#"}
                  target="_blank"
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #eee",
                    background: "white",
                    textDecoration: "none",
                    color: "#111",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  {item.description ? <div style={{ fontSize: 12, color: "#666" }}>{item.description}</div> : null}
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
