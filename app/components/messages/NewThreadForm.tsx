"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  label: string;
};

const NEW_THREAD_BODY = "Hi — starting a new conversation.";

export default function NewThreadForm({
  options,
  redirectBase,
}: {
  options: Option[];
  redirectBase: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startConversation(recipientId: string) {
    if (!recipientId) {
      setStatus("Choose someone to message.");
      return;
    }
    setLoading(true);
    setStatus(null);

    const res = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body: NEW_THREAD_BODY }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Failed to start thread.");
      return;
    }

    const json = await res.json();
    router.push(`${redirectBase}/${json.threadId}`);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
      <label>
        Start a conversation
        <select
          defaultValue=""
          onChange={(e) => startConversation(e.target.value)}
          disabled={loading}
        >
          <option value="">Choose someone</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
        Selecting a person will open a new thread and take you there so you can continue the conversation.
      </p>
      {status ? <p style={{ color: "var(--pink)", margin: 0 }}>{status}</p> : null}
    </div>
  );
}
