import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const uploadDir = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch {
    // noop
  }
}

export async function uploadFile(file: File) {
  if (!file || file.size === 0) return null;

  await ensureUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name || "") || "";
  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

export function getPublicUrl(fileRef: string | null | undefined) {
  if (!fileRef) return null;
  if (fileRef.startsWith("http")) return fileRef;
  return fileRef;
}

export async function deleteFile(fileRef: string | null | undefined) {
  if (!fileRef || !fileRef.startsWith("/uploads/")) return;
  const cleaned = fileRef.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", cleaned);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore missing files
  }
}
