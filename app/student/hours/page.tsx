import { HourStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import TimerClient from "./TimerClient";

export const dynamic = "force-dynamic";

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function StudentHoursPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) return null;

  const [entries, totals] = await Promise.all([
    prisma.hourEntry.findMany({
      where: { studentId: user.id },
      orderBy: [{ startedAt: "desc" }, { date: "desc" }],
    }),
    prisma.hourEntry.groupBy({
      by: ["status"],
      _sum: { minutes: true },
      where: { studentId: user.id },
    }),
  ]);

  const sum: Record<HourStatus, number> = {
    [HourStatus.APPROVED]: 0,
    [HourStatus.PENDING]: 0,
    [HourStatus.REJECTED]: 0,
  };
  totals.forEach((row) => {
    sum[row.status as HourStatus] = row._sum.minutes ?? 0;
  });

  return (
    <div className="stack">
      <section
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h1>Clock in</h1>
            <p>Use the timer to log hours. Totals update after each submission.</p>
          </div>
          <TimerClient />
          <div className="stat-grid">
            {Object.entries(sum).map(([status, mins]) => (
              <div key={status} className="stat-card">
                <span>{status}</span>
                <strong>{formatMinutes(mins)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2>Recent entries</h2>
          {entries.length === 0 ? (
            <p>No entries logged yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>Stop</th>
                  <th>Minutes</th>
                  <th>Program</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.startedAt ?? entry.date)}</td>
                    <td>{formatDateTime(entry.endedAt ?? entry.date)}</td>
                    <td>{formatMinutes(entry.minutes)}</td>
                    <td>{entry.programKey ?? "N/A"}</td>
                    <td>{entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
