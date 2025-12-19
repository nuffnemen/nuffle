import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/app/components/LoginForm";
import { dashboardPathForRole, getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          border: "1px solid rgba(5, 5, 5, 0.12)",
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 420,
          background: "var(--card)",
          boxShadow: "0 20px 40px rgba(5, 5, 5, 0.12)",
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 32 }}>NUFFLE</h1>
        <p style={{ marginBottom: 12, color: "var(--text-muted)" }}>Role-aware campus OS. Sign in to continue.</p>
        <LoginForm />
        <p style={{ marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
          New to NUFFLE? <Link href="/create-account">Create an account</Link>.
        </p>
      </div>
    </main>
  );
}
