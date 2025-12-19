import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";

type ResourceSummary = {
  id: string;
  title: string;
  description: string | null;
};

const ALLOWED_ROLES = [Role.STUDENT, Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR, Role.ADMIN];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const [assignments, materials] = await Promise.all([
    prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.curriculumMaterial.findMany({
      where: {
        OR: [
          { visibleToRoles: { isEmpty: true } },
          { visibleToRoles: { has: user.role } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const assignmentSummary: ResourceSummary[] = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description ?? null,
  }));
  const materialSummary: ResourceSummary[] = materials.map((material) => ({
    id: material.id,
    title: material.title,
    description: material.description ?? null,
  }));

  const attachmentSummaries = materials.map((material) => ({
    title: material.title,
    url: getPublicUrl(material.fileRef),
  }));

  const bulletify = (items: ResourceSummary[], label: string) =>
    items.map((item) => `- ${label}: ${item.title}${item.description ? ` — ${item.description}` : ""}`);

  const contextLines = [
    ...bulletify(assignmentSummary, "Assignment"),
    ...bulletify(materialSummary, "Curriculum"),
    ...attachmentSummaries
      .map((attachment) => (attachment.url ? `- Attachment: ${attachment.title} — ${attachment.url}` : `- Attachment: ${attachment.title}`)),
  ];

  const contextText = contextLines.length ? contextLines.join("\n") : "No curriculum or assignments available yet.";

  const systemPrompt = `
You are an AI assistant for Cambria Academy. Only answer questions by referencing the provided curriculum materials and assignments.
If the information you need is not covered by the supplied resources, say so and do not hallucinate new facts.
Mention the title of the material or assignment you cited so the user can reference the source.
`;

  const modelMessages = [
    { role: "system", content: systemPrompt.trim() },
    {
      role: "user",
      content: `Question: ${question}\n\nResources:\n${contextText}`,
    },
  ];

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    const fallbackAnswer = `OpenAI is not configured in this environment, so here is a summary pulled from the curriculum and assignments you requested:\n${contextText}`;
    return NextResponse.json({
      answer: fallbackAnswer,
      sources: contextLines.slice(0, 5),
      isFallback: true,
      context: {
        assignments: assignmentSummary.map((a) => a.title),
        materials: materialSummary.map((m) => m.title),
        attachments: attachmentSummaries.map((a) => a.title),
      },
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: modelMessages,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail =
        data?.error?.message ||
        data?.error?.type ||
        "The OpenAI API rejected the request.";
      return NextResponse.json(
        { error: detail },
        { status: response.status || 502 }
      );
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json(
        { error: "OpenAI returned no text in the completion." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer,
      sources: contextLines.slice(0, 5),
      context: {
        assignments: assignmentSummary.map((a) => a.title),
        materials: materialSummary.map((m) => m.title),
        attachments: attachmentSummaries.map((a) => a.title),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to reach the AI assistant. Please try again later.",
      },
      { status: 502 }
    );
  }
}
