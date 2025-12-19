import Link from "next/link";
import CreateAccountForm from "@/app/components/CreateAccountForm";

export default function CreateAccountPage() {
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
          maxWidth: 520,
          background: "var(--card)",
          boxShadow: "0 20px 40px rgba(5, 5, 5, 0.12)",
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 32 }}>Create account</h1>
        <p style={{ marginBottom: 24, color: "var(--text-muted)" }}>
          Bring your instructors, peers, and campus tools together with a verified NUFFLE account.
        </p>
        <CreateAccountForm />
        <p style={{ marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
          Already have an account? <Link href="/">Sign in instead</Link>.
        </p>
      </div>
    </main>
  );
}
