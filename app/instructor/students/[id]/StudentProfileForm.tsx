"use client";

import { Role, User } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  student: Pick<User, "id" | "name" | "email" | "classGroup" | "role">;
  canEditRole: boolean;
};

export default function StudentProfileForm({ student, canEditRole }: Props) {
  const router = useRouter();
  const [name, setName] = useState(student.name ?? "");
  const [classGroup, setClassGroup] = useState(student.classGroup ?? "");
  const [role, setRole] = useState<Role>(student.role);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const res = await fetch(`/api/users/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        classGroup,
        role: canEditRole ? role : undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Failed to save profile");
      return;
    }

    setStatus("Saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
      </label>

      <label>
        Class group
        <input value={classGroup} onChange={(e) => setClassGroup(e.target.value)} placeholder="e.g. 2025A" />
      </label>

      {canEditRole ? (
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value={Role.STUDENT}>Student</option>
            <option value={Role.INSTRUCTOR}>Instructor</option>
            <option value={Role.HEAD_INSTRUCTOR}>Head Instructor</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
        </label>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </button>
      {status ? <p style={{ color: status === "Saved" ? "var(--gold)" : "var(--pink)" }}>{status}</p> : null}
    </form>
  );
}
