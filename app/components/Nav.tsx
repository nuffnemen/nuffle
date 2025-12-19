"use client";
import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  role: string;
  userName?: string | null;
  items: NavItem[];
  notificationCount?: number;
  messageNotificationCount?: number;
};

const iconMap: Record<string, string> = {
  Dashboard: "🏠",
  Notifications: "🔔",
  Hours: "⏱️",
  Assignments: "📝",
  Grades: "🎯",
  Messages: "✉️",
  Curriculum: "📚",
  Portfolio: "🧰",
  Students: "👥",
  Settings: "⚙️",
  "NUFF AI": "🤖",
  "Head Instructor View": "🧭",
  "Instructor View": "🧭",
  "Instructor Tools": "🧭",
  "Instructor Tasks": "🗂️",
  "Admin Dashboard": "🛡️",
};

function iconForLabel(label: string) {
  return iconMap[label] ?? "❖";
}

export default function Nav({
  role,
  userName,
  items,
  notificationCount = 0,
  messageNotificationCount = 0,
}: Props) {
  const pathname = usePathname();
  const [isStackOpen, setStackOpen] = useState(false);
  const closeStack = () => {
    if (isStackOpen) {
      setStackOpen(false);
    }
  };
  const isDashboardTab = (item: NavItem) => item.label === "Dashboard" || item.href === "/";
  const isNotificationTab = (item: NavItem) => item.href === "/notifications";
  const isMessageTab = (item: NavItem) => item.href.includes("/messages");
  const primaryNavItems = items.filter((item) => isDashboardTab(item) || isNotificationTab(item) || isMessageTab(item));
  const primaryNavHrefs = new Set(primaryNavItems.map((item) => item.href));
  const stackedNavItems = items.filter((item) => !primaryNavHrefs.has(item.href));

  const renderLink = (item: NavItem, variant: "primary" | "stacked") => {
    const active =
      item.href === "/"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const ariaLabel = `Go to ${item.label.toLowerCase()}${active ? ", current page" : ""}`;
    const badgeValue = isNotificationTab(item)
      ? notificationCount
      : isMessageTab(item)
        ? messageNotificationCount
        : 0;

    const baseStyle: CSSProperties = {
      padding: variant === "primary" ? "12px 16px" : "10px 14px",
      borderRadius: variant === "primary" ? 20 : 12,
      background: active ? "rgba(255, 95, 162, 0.12)" : "transparent",
      color: active ? "var(--pink)" : "var(--text-primary)",
      fontWeight: active ? 600 : 400,
      textDecoration: "none",
      transition: "background 0.2s ease",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      border: "1px solid transparent",
      position: "relative",
      minWidth: variant === "primary" ? 72 : 60,
    };

    const icon = iconForLabel(item.label);
    return (
      <Link key={item.href} href={item.href} style={baseStyle} aria-label={ariaLabel} onClick={closeStack}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 11, letterSpacing: "0.02em" }}>{item.label}</span>
        {badgeValue > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 18,
              height: 18,
              borderRadius: "999px",
              background: "var(--pink)",
              color: "#050505",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {badgeValue}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(255, 255, 255, 0.95)",
        borderBottom: "1px solid rgba(5, 5, 5, 0.08)",
        boxShadow: "0 10px 30px rgba(5, 5, 5, 0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "18px 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          NUFFLE
        </Link>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {primaryNavItems.map((item) => renderLink(item, "primary"))}
          {stackedNavItems.length ? (
            <button
              type="button"
              onClick={() => setStackOpen((prev) => !prev)}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-primary)",
                fontWeight: 500,
                cursor: "pointer",
              }}
              aria-expanded={isStackOpen}
            >
              {isStackOpen ? "Hide extras" : `More (${stackedNavItems.length})`}
            </button>
          ) : null}
        </div>
        {stackedNavItems.length && isStackOpen ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
              gap: 6,
              width: "100%",
            }}
          >
            {stackedNavItems.map((item) => renderLink(item, "stacked"))}
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 14, color: "var(--text-muted)", display: "flex", gap: 12, alignItems: "center" }}>
          <span>
            {userName ?? "User"} · {role}
          </span>
          <form action="/logout" method="post">
            <button type="submit" className="btn btn-outline">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
