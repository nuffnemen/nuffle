import Link from "next/link";
import { AttendanceStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveAttendance } from "./actions";

const DAYS_PER_WEEK = 5;
const RECORD_WINDOW_DAYS = 365;

type Props = {
  searchParams?: Promise<{ date?: string } | undefined> | { date?: string } | undefined;
};

function statusLabel(status: AttendanceStatus) {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return "Present";
    case AttendanceStatus.ABSENT:
      return "Absent";
    default:
      return status;
  }
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  return parsed.toLocaleDateString();
}

function parseDateParam(value?: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function clampDate(date: Date, min: Date, max: Date) {
  const result = new Date(date);
  if (result < min) {
    return new Date(min);
  }
  if (result > max) {
    return new Date(max);
  }
  return result;
}

export default async function InstructorAttendancePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.INSTRUCTOR && user.role !== Role.HEAD_INSTRUCTOR && user.role !== Role.ADMIN)) {
    return null;
  }

  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT, isActive: true },
    orderBy: { name: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recordWindowStart = new Date(today);
  recordWindowStart.setDate(recordWindowStart.getDate() - RECORD_WINDOW_DAYS + 1);
  recordWindowStart.setHours(0, 0, 0, 0);

  const calendarStart = new Date(recordWindowStart);
  const offsetToMonday = (calendarStart.getDay() + 6) % 7;
  calendarStart.setDate(calendarStart.getDate() - offsetToMonday);
  calendarStart.setHours(0, 0, 0, 0);

  const resolvedSearchParams = await searchParams;
  const requestedDate = parseDateParam(resolvedSearchParams?.date ?? undefined);
  const selectedDate = clampDate(requestedDate ?? today, recordWindowStart, today);
  const selectedDateKey = formatDateKey(selectedDate);

  const [selectedDayAttendance, attendanceHistory] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: selectedDate },
    }),
    prisma.attendance.findMany({
      where: {
        date: {
          gte: calendarStart,
          lte: today,
        },
      },
      include: { student: true },
      orderBy: [
        { date: "desc" },
        { student: { name: "asc" } },
      ],
    }),
  ]);

  const attendanceByStudent = selectedDayAttendance.reduce<Record<string, typeof selectedDayAttendance[number]>>((acc, attendance) => {
    acc[attendance.studentId] = attendance;
    return acc;
  }, {});

  const studentNameMap = Object.fromEntries(
    students.map((student) => [student.id, student.name ?? student.email]),
  ) as Record<string, string>;

  const historyByDate = new Map<string, typeof attendanceHistory[number][]>();
  attendanceHistory.forEach((record) => {
    const key = formatDateKey(record.date);
    const existing = historyByDate.get(key);
    if (existing) {
      existing.push(record);
    } else {
      historyByDate.set(key, [record]);
    }
  });

  const recordedPresent = Object.values(attendanceByStudent).filter(
    (attendance) => attendance.status === AttendanceStatus.PRESENT,
  ).length;
  const recordedAbsent = Object.values(attendanceByStudent).filter(
    (attendance) => attendance.status === AttendanceStatus.ABSENT,
  ).length;

  const selectedWeekStart = new Date(selectedDate);
  const selectedWeekOffset = (selectedWeekStart.getDay() + 6) % 7;
  selectedWeekStart.setDate(selectedWeekStart.getDate() - selectedWeekOffset);
  selectedWeekStart.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => {
    const day = new Date(selectedWeekStart);
    day.setDate(day.getDate() + dayIndex);
    const key = formatDateKey(day);
    const records = historyByDate.get(key) ?? [];
    return {
      key,
      date: day,
      records,
      presentCount: records.filter((record) => record.status === AttendanceStatus.PRESENT).length,
      absentCount: records.filter((record) => record.status === AttendanceStatus.ABSENT).length,
      weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
      isSelectable: day >= recordWindowStart && day <= today,
    };
  });

  const prevWeekStart = new Date(selectedWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const nextWeekStart = new Date(selectedWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const canGoPrevWeek = prevWeekStart >= recordWindowStart;
  const canGoNextWeek = nextWeekStart <= today;
  const prevWeekKey = formatDateKey(clampDate(prevWeekStart, recordWindowStart, today));
  const nextWeekKey = formatDateKey(clampDate(nextWeekStart, recordWindowStart, today));

  const todaysDateValue = selectedDateKey;
  const recordWindowKey = formatDateKey(recordWindowStart);
  const todayKey = formatDateKey(today);

  return (
    <div className="stack attendance-page-grid">
      <section className="card">
        <h1>Attendance</h1>
        <p>Mark attendance once per day. Everyone starts out present—uncheck a box to mark a student absent, then save.</p>

        <form action={saveAttendance} className="attendance-form">
          <div className="attendance-form__header">
            <label className="attendance-form__date" htmlFor="attendance-date">
              <span className="attendance-form__field-label">Date</span>
              <input id="attendance-date" type="date" name="date" defaultValue={todaysDateValue} />
            </label>
            <p className="attendance-form__summary">
              Recorded: {recordedPresent} present · {recordedAbsent} absent
            </p>
          </div>

          <div className="attendance-student-grid">
            {students.map((student) => {
              const record = attendanceByStudent[student.id];
              const isAbsent = record?.status === AttendanceStatus.ABSENT;
              return (
                <label key={student.id} className="attendance-student-card">
                  <input type="hidden" name="studentIds" value={student.id} />
                  <span className="attendance-student-card__name">{student.name ?? student.email}</span>
                  <input
                    type="checkbox"
                    name="presentIds"
                    value={student.id}
                    defaultChecked={!isAbsent}
                    className="attendance-student-card__checkbox"
                  />
                  <span className="attendance-student-card__meta">
                    {record
                      ? `Recorded ${statusLabel(record.status)}`
                      : "Not recorded yet"}
                  </span>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary">
              Save attendance
            </button>
          </div>
        </form>
      </section>

      <section className="card attendance-calendar-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Attendance calendar</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
              Viewing {formatDisplayDate(selectedDateKey)}
            </p>
          </div>
          <form action="/instructor/attendance" className="attendance-calendar-jump">
            <label>
              Jump to date
              <input type="date" name="date" defaultValue={selectedDateKey} min={recordWindowKey} max={todayKey} />
            </label>
            <button type="submit" className="btn btn-outline">
              Go
            </button>
          </form>
          <div style={{ display: "flex", gap: 8 }}>
            {canGoPrevWeek ? (
              <Link href={`/instructor/attendance?date=${prevWeekKey}`} className="btn btn-outline">
                Previous week
              </Link>
            ) : (
              <span
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                Previous week
              </span>
            )}
            {canGoNextWeek ? (
              <Link href={`/instructor/attendance?date=${nextWeekKey}`} className="btn btn-outline">
                Next week
              </Link>
            ) : (
              <span
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                Next week
              </span>
            )}
          </div>
        </div>

        <div className="attendance-calendar-weeks" style={{ marginTop: 16 }}>
          <div className="attendance-calendar-week">
            <div className="attendance-calendar-week__header">
              <span>Week view</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formatDisplayDate(weekDays[0].key)} – {formatDisplayDate(weekDays[weekDays.length - 1].key)}
              </span>
            </div>
            <div className="attendance-calendar-week__days">
              {weekDays.map((day) => {
                const isSelected = day.key === selectedDateKey;
                const classNames = [
                  "attendance-day-card",
                  isSelected ? "attendance-day-card--selected" : "",
                  !day.isSelectable ? "attendance-day-card--disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const content = (
                  <>
                    <span className="attendance-day-card__weekday">{day.weekday}</span>
                    <strong>{formatDisplayDate(day.key)}</strong>
                    <span style={{ fontSize: 14 }}>Present: {day.presentCount}</span>
                    <span style={{ fontSize: 14 }}>Absent: {day.absentCount}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Records: {day.records.length}
                    </span>
                  </>
                );
                if (day.isSelectable) {
                  return (
                    <Link key={day.key} href={`/instructor/attendance?date=${day.key}`} className={classNames}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={day.key} className={classNames} aria-disabled>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Selected day breakdown</p>
          <p style={{ margin: "6px 0 0", fontSize: 14 }}>
            Present ({recordedPresent}):{" "}
            {recordedPresent > 0 ? students
              .filter((student) => attendanceByStudent[student.id]?.status === AttendanceStatus.PRESENT)
              .map((student) => studentNameMap[student.id])
              .join(", ")
              : "None"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 14 }}>
            Absent ({recordedAbsent}):{" "}
            {recordedAbsent > 0 ? students
              .filter((student) => attendanceByStudent[student.id]?.status === AttendanceStatus.ABSENT)
              .map((student) => studentNameMap[student.id])
              .join(", ")
              : "None"}
          </p>
        </div>
      </section>
    </div>
  );
}
