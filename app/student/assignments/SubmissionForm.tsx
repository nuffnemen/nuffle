"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmissionForm({
  assignmentId,
  existingText,
  canSubmit,
  resubmissionRequested,
}: {
  assignmentId: string;
  existingText?: string | null;
  canSubmit: boolean;
  resubmissionRequested: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(existingText ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(resubmissionRequested);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) {
      setStatus("Submissions are closed. Request another attempt.");
      return;
    }
    setLoading(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    formData.set("textAnswer", text);

    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Failed to submit assignment.");
      return;
    }

    setStatus("Submitted!");
    router.refresh();
  }

  async function handleRequest() {
    setRequestLoading(true);
    setRequestMessage(null);
    const res = await fetch(`/api/assignments/${assignmentId}/request-resubmission`, {
      method: "POST",
    });
    setRequestLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setRequestMessage(data.error || "Unable to submit request.");
      return;
    }

    setRequestPending(true);
    setRequestMessage("Request sent. Awaiting instructor approval.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }} encType="multipart/form-data">
      <label>
        Text answer
        <textarea
          name="textAnswer"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canSubmit || loading}
        />
      </label>
      <label>
        Attachments (optional)
        <input name="attachments" type="file" multiple accept=".pdf,image/*" disabled={!canSubmit || loading} />
      </label>
      <button type="submit" className="btn btn-primary" disabled={loading || !canSubmit}>
        {loading ? "Submitting..." : "Submit"}
      </button>
      {!canSubmit ? (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
          <p style={{ marginBottom: 8 }}>
            Your submission is locked. Request another submission window to upload changes.
          </p>
          <button
            type="button"
            onClick={handleRequest}
            className="btn btn-outline"
            disabled={requestLoading || requestPending}
          >
            {requestPending ? "Request pending" : requestLoading ? "Sending..." : "Request another submission"}
          </button>
          {requestMessage ? (
            <p style={{ marginTop: 8, color: "var(--gold)" }}>
              {requestMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      {status ? <p style={{ color: status === "Submitted!" ? "var(--gold)" : "var(--pink)" }}>{status}</p> : null}
    </form>
  );
}
