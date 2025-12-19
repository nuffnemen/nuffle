"use client";

import { useState } from "react";

type AssignmentSummary = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
};

type MaterialSummary = {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
};

type ApiResponse = {
  answer: string;
  sources?: string[];
  context?: {
    assignments: string[];
    materials: string[];
  };
  isFallback?: boolean;
};

type Props = {
  assignments: AssignmentSummary[];
  materials: MaterialSummary[];
};

export default function AIAssistant({ assignments, materials }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setStatus("Ask something specific about the curriculum or assignments.");
      return;
    }

    setLoading(true);
    setStatus(null);
    setAnswer(null);
    setSources([]);

    const res = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Assistant unavailable" }));
      setStatus(error?.error ?? "Something went wrong while reaching the assistant.");
      return;
    }

    const data = (await res.json()) as ApiResponse;
    setAnswer(data.answer);
    setSources(data.sources ?? []);
    if (data.isFallback) {
      setStatus("Running in offline mode; the assistant summarized the data without contacting GPT.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontWeight: 600 }}>Ask NUFF anything about the curriculum or assignments</label>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          placeholder="How should I approach the upcoming mock assignment?"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Thinking…" : "Ask NUFF"}
        </button>
        {status ? <p style={{ margin: 0, color: "var(--text-muted)" }}>{status}</p> : null}
      </form>

      {answer ? (
        <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "white" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>AI response</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{answer}</div>
          {sources.length > 0 ? (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
              Referenced materials:
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {sources.map((source, index) => (
              <li key={`${source}-${index}`}>{source}</li>
            ))}
          </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "white" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Included context</div>
        {materials.length === 0 && assignments.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>No curriculum or assignments are available yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {assignments.length > 0 ? (
              <div>
                <strong>Assignments</strong>
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {assignments.map((assignment) => (
                    <li key={assignment.id}>
                      {assignment.title}
                      {assignment.dueAt ? ` (due ${new Date(assignment.dueAt).toLocaleDateString()})` : ""}
                      {assignment.pointsPossible ? ` — ${assignment.pointsPossible} points` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {materials.length > 0 ? (
              <div>
                <strong>Curriculum materials</strong>
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {materials.map((material) => (
                    <li key={material.id}>
                      [{material.materialType.replace("_", " ")}] {material.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
