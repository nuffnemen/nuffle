import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CurriculumMaterialType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteFile, getPublicUrl, uploadFile } from "@/lib/storage";

async function addMaterial(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) redirect("/");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const materialType = formData.get("materialType") as CurriculumMaterialType;
  const visibleTo = (formData.get("visibleTo") as string)?.trim();
  const file = formData.get("file") as File;

  if (!title || !file || file.size === 0) throw new Error("Missing fields");

  const fileRef = await uploadFile(file);
  if (!fileRef) throw new Error("Upload failed");

  await prisma.curriculumMaterial.create({
    data: {
      title,
      description,
      materialType,
      fileRef,
      visibleToRoles: visibleTo ? visibleTo.split(",").map((role) => role.trim()) : [],
      uploadedById: user.id,
    },
  });

  revalidatePath("/instructor/curriculum");
  revalidatePath("/student/curriculum");
}

async function removeMaterial(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) redirect("/");

  const id = formData.get("materialId") as string;
  const material = await prisma.curriculumMaterial.findUnique({ where: { id } });
  if (!material) return;
  await prisma.curriculumMaterial.delete({ where: { id } });
  await deleteFile(material.fileRef);
  revalidatePath("/instructor/curriculum");
  revalidatePath("/student/curriculum");
}

export default async function InstructorCurriculumPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) return null;
  const canManage = user.role === Role.ADMIN;

  const materials = await prisma.curriculumMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: true },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1>Curriculum Materials</h1>

      {canManage ? (
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
          <h2>Upload material</h2>
          <form action={addMaterial} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Description
              <textarea name="description" rows={3} />
            </label>
            <label>
              Type
              <select name="materialType" defaultValue={CurriculumMaterialType.HANDOUT}>
                {Object.values(CurriculumMaterialType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Visible to roles (comma separated, blank = everyone)
              <input name="visibleTo" placeholder="Example: STUDENT,INSTRUCTOR" />
            </label>
            <label>
              File
              <input type="file" name="file" required />
            </label>
            <button type="submit">Upload</button>
          </form>
        </section>
      ) : (
        <section className="card">
          <p>
            Only admins can add or remove curriculum materials. Instructors and head instructors may view the
            library below.
          </p>
        </section>
      )}

      <section>
        <h2>Library</h2>
        {materials.length === 0 ? (
          <p>No materials available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {materials.map((material) => (
              <div key={material.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{material.title}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {material.materialType} · Uploaded by {material.uploadedBy?.name ?? material.uploadedBy?.email}
                    </div>
                  </div>
                  <form action={removeMaterial}>
                    <input type="hidden" name="materialId" value={material.id} />
                    <button type="submit">Delete</button>
                  </form>
                </div>
                {material.description ? <p>{material.description}</p> : null}
                <a href={getPublicUrl(material.fileRef) ?? "#"} target="_blank">
                  Download
                </a>
                {material.visibleToRoles.length ? (
                  <div style={{ fontSize: 12, color: "#777" }}>Visible to: {material.visibleToRoles.join(", ")}</div>
                ) : (
                  <div style={{ fontSize: 12, color: "#777" }}>Visible to everyone</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
