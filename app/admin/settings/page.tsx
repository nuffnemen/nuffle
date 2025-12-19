import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getClockLocation } from "@/lib/clock";
import DeleteUserButton from "@/app/components/DeleteUserButton";
import ClockLocationForm from "./ClockLocationForm";
import { updateUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return null;
  }

  const location = await getClockLocation();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="stack">
      <section className="card">
        <ClockLocationForm
          key={`clock-location-${location.id ?? "default"}-${location.updatedAt ?? ""}`}
          location={location}
        />
      </section>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>User management</h2>
            <p style={{ marginTop: 4, color: "var(--text-muted)" }}>
              Edit names, emails, and roles for every account.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr auto auto",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              padding: "8px 0",
            }}
          >
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Update</span>
            <span>Delete</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr auto auto",
                  gap: 8,
                  padding: "12px 0",
                  borderTop: "1px solid #eee",
                  alignItems: "center",
                }}
              >
                <form action={updateUser} style={{ display: "contents" }}>
                  <input
                    type="hidden"
                    name="userId"
                    value={u.id}
                    style={{ display: "none" }}
                  />
                  <input
                    name="name"
                    defaultValue={u.name ?? ""}
                    placeholder="Name"
                    style={{ padding: 8, borderRadius: 4, border: "1px solid var(--border)" }}
                    aria-label={`Name for ${u.email}`}
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={u.email}
                    placeholder="Email"
                    style={{ padding: 8, borderRadius: 4, border: "1px solid var(--border)" }}
                    aria-label={`Email for ${u.name ?? u.email}`}
                    required
                  />
                  <select
                    name="role"
                    defaultValue={u.role}
                    style={{ padding: 8, borderRadius: 4, border: "1px solid var(--border)" }}
                    aria-label={`Role for ${u.email}`}
                  >
                    {Object.values(Role).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <button type="submit" className="btn btn-primary">
                      Save changes
                    </button>
                  </div>
                </form>
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <DeleteUserButton userId={u.id} userName={u.name ?? null} userEmail={u.email} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
