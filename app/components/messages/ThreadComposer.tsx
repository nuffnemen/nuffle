"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ThreadComposer({ threadId, redirectPath }: { threadId: string; redirectPath: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Enter a message.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send message.");
      return;
    }
    setBody("");
    router.refresh();
    router.push(redirectPath);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea
        rows={4}
        placeholder="Type your reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Sending..." : "Send"}
      </button>
      {error ? <p style={{ color: "var(--pink)" }}>{error}</p> : null}
    </form>
  );
}
