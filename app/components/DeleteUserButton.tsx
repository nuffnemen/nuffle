"use client";

import { useRef } from "react";
import { deleteUser } from "@/app/admin/settings/actions";

type Props = {
  userId: string;
  userName: string | null;
  userEmail: string;
};

export default function DeleteUserButton({ userId, userName, userEmail }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDelete = () => {
    const label = userName ?? userEmail;
    if (!confirm(`Delete ${label}? This action cannot be undone.`)) return;
    formRef.current?.requestSubmit();
  };

  return (
    <form action={deleteUser} ref={formRef} style={{ display: "contents" }}>
      <input type="hidden" name="userId" value={userId} />
      <button type="button" onClick={handleDelete} className="btn btn-outline" style={{ borderColor: "#b00020", color: "#b00020" }}>
        Delete
      </button>
    </form>
  );
}
