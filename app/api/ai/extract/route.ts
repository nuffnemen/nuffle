import { NextResponse } from "next/server";
import { pdfToText } from "@/lib/pdf";

export async function POST(req: Request) {
  const formData = await req.formData();
  const files: { name: string; text: string }[] = [];

  for (const entry of formData.values()) {
    const file = entry as File;
    if (!file || !file.name) continue;

    const buffer = await file.arrayBuffer();
    const text = await pdfToText(new Uint8Array(buffer));
    files.push({ name: file.name, text: text.trim() || "No text extracted." });
  }

  return NextResponse.json({ extracted: files });
}
