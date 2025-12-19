import { PDFParse } from "pdf-parse";

export async function pdfToText(data: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const textResult = await parser.getText();
    return (textResult.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}
