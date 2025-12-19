import Image from "next/image";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPublicUrl, uploadFile } from "@/lib/storage";

async function addPortfolioItem(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) redirect("/");

  const caption = (formData.get("caption") as string) || null;
  const image = formData.get("image") as File;
  if (!image || image.size === 0) throw new Error("Missing image");

  const ref = await uploadFile(image);
  if (!ref) throw new Error("Upload failed");

  await prisma.portfolioItem.create({
    data: {
      studentId: user.id,
      imageRef: ref,
      caption,
    },
  });

  revalidatePath("/student/portfolio");
}

export default async function StudentPortfolioPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

  const items = await prisma.portfolioItem.findMany({
    where: { studentId: user.id },
    include: { feedbackBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1>Portfolio</h1>
        <p style={{ color: "#555" }}>Upload work samples for instructor feedback.</p>
      </div>

      <form action={addPortfolioItem} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <label>
          Caption
          <input type="text" name="caption" placeholder="Optional caption" />
        </label>
        <label>
          Image
          <input type="file" name="image" accept="image/*" required />
        </label>
        <button type="submit">Upload</button>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "white" }}>
            {item.imageRef ? (
              <Image
                src={getPublicUrl(item.imageRef) ?? ""}
                alt={item.caption ?? "Portfolio item"}
                width={600}
                height={400}
                style={{ width: "100%", height: "auto", borderRadius: 8 }}
                unoptimized
              />
            ) : null}
            {item.caption ? <div style={{ marginTop: 8 }}>{item.caption}</div> : null}
            {item.instructorFeedback ? (
              <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
                Feedback from {item.feedbackBy?.name ?? item.feedbackBy?.email}: {item.instructorFeedback}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>Awaiting feedback</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
