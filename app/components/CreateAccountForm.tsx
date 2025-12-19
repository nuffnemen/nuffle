"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function CreateAccountForm() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    form.username.trim() &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.trim();

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) {
      setStatus("Fill in every field.");
      return;
    }

    setLoading(true);
    setStatus("Creating your account…");

    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          username: form.username.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Success! Redirecting to the dashboard.");
    router.push("/me");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label>
        Username
        <input
          value={form.username}
          onChange={(event) => handleChange("username", event.target.value)}
          placeholder="Choose a username"
          autoComplete="username"
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1 }}>
          First name
          <input
            value={form.firstName}
            onChange={(event) => handleChange("firstName", event.target.value)}
            placeholder="First name"
            autoComplete="given-name"
          />
        </label>
        <label style={{ flex: 1 }}>
          Last name
          <input
            value={form.lastName}
            onChange={(event) => handleChange("lastName", event.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
          />
        </label>
      </div>
      <label>
        Email
        <input
          value={form.email}
          onChange={(event) => handleChange("email", event.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
        />
      </label>
      <label>
        Password
        <input
          value={form.password}
          onChange={(event) => handleChange("password", event.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="new-password"
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={!canSubmit || loading}>
        {loading ? "Creating…" : "Create account"}
      </button>
      {status ? <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{status}</p> : null}
    </form>
  );
}
