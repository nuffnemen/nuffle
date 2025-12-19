"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AllowedLocation } from "@/lib/clock";

const STORAGE_KEY = "cambria_timer_startedAt";
const STORAGE_PROGRAM_KEY = "cambria_timer_programKey";

const PROGRAM_OPTIONS = [
  { value: "COSMETOLOGY", label: "Cosmetology" },
  { value: "NAIL_TECH", label: "Nail Technology" },
] as const;

const DEFAULT_LOCATION: AllowedLocation = {
  lat: 41.736258,
  lng: -111.857516,
  radiusMeters: 150,
  label: "Campus",
  isEnabled: false,
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pad(num: number) {
  return String(num).padStart(2, "0");
}

export default function TimerClient() {
  const [programKey, setProgramKey] = useState<string>(PROGRAM_OPTIONS[0].value);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [locationHint, setLocationHint] = useState<string>("");
  const [allowedLocation, setAllowedLocation] = useState(DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION.label ?? "Campus");
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    setLocationLoading(true);
    fetch("/api/clock-location", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.lat && data?.lng) {
          const parsed: AllowedLocation = {
            lat: Number(data.lat),
            lng: Number(data.lng),
            radiusMeters: Number(data.radiusMeters) || DEFAULT_LOCATION.radiusMeters,
            label: data.label ?? DEFAULT_LOCATION.label,
            isEnabled:
              typeof data.isEnabled === "boolean" ? data.isEnabled : DEFAULT_LOCATION.isEnabled,
          };

          setAllowedLocation(parsed);
          setLocationLabel(parsed.label ?? DEFAULT_LOCATION.label ?? "Campus");
        }
      })
      .finally(() => setLocationLoading(false));
  }, []);

  const ensureLocation = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (!allowedLocation.isEnabled) {
        setLocationHint("");
        resolve(true);
        return;
      }

      if (!navigator.geolocation) {
        setLocationHint("Geolocation is required to clock in.");
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const meters = distanceMeters(
            position.coords.latitude,
            position.coords.longitude,
            allowedLocation.lat,
            allowedLocation.lng,
          );
          if (meters <= allowedLocation.radiusMeters) {
            setLocationHint("");
            resolve(true);
          } else {
            setLocationHint(
              `Clock-in only allowed within ${allowedLocation.radiusMeters}m of ${allowedLocation.label ?? "campus"}.`,
            );
            resolve(false);
          }
        },
        () => {
          setLocationHint("Location access required to clock in.");
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, [allowedLocation]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) setStartedAt(parsed);
    }
    const savedProgram = window.localStorage.getItem(STORAGE_PROGRAM_KEY);
    if (savedProgram) setProgramKey(savedProgram);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_PROGRAM_KEY, programKey);
  }, [programKey]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  }, [now, startedAt]);

  const start = useCallback(async () => {
    const timestamp = Date.now();
    const allowed = await ensureLocation();
    if (!allowed) return;

    setStartedAt(timestamp);
    window.localStorage.setItem(STORAGE_KEY, String(timestamp));
    setMessage("");
  }, [ensureLocation]);

  const stop = useCallback(async () => {
    if (!startedAt) return;
    const allowed = await ensureLocation();
    if (!allowed) return;
    setIsSaving(true);
    const seconds = elapsedSeconds;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const endedAt = Date.now();
    const startISO = new Date(startedAt).toISOString();
    const endISO = new Date(endedAt).toISOString();

    try {
      const res = await fetch("/api/student/hours/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes, programKey, startedAt: startISO, endedAt: endISO }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to log hours");
      }

      setMessage(`Logged ${minutes} minutes for approval.`);
      setStartedAt(null);
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.href = "/student/hours";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to log hours.");
    } finally {
      setIsSaving(false);
    }
  }, [elapsedSeconds, ensureLocation, programKey, startedAt]);

  const hh = pad(Math.floor(elapsedSeconds / 3600));
  const mm = pad(Math.floor((elapsedSeconds % 3600) / 60));
  const ss = pad(elapsedSeconds % 60);

  return (
    <div className="card" style={{ gap: 16, display: "flex", flexDirection: "column" }}>
      <div>
        <label>
          Program{" "}
          <select value={programKey} onChange={(e) => setProgramKey(e.target.value)}>
            {PROGRAM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ fontSize: 48, fontWeight: 700, marginTop: 16 }}>
        {hh}:{mm}:{ss}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={start} disabled={!!startedAt || isSaving} className="btn btn-outline">
          Start clock
        </button>
        <button type="button" onClick={stop} disabled={!startedAt || isSaving} className="btn btn-primary">
          Stop & submit
        </button>
      </div>

      <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 14 }}>
        {allowedLocation.isEnabled
          ? `Location required: ${locationLabel} · within ${allowedLocation.radiusMeters}m`
          : "Location enforcement disabled; start the timer from anywhere."}
        {locationLoading ? " (loading…)" : ""}
      </p>
      <p style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 14 }}>
        When you stop, your time is rounded up to the nearest minute and sent as a pending entry for instructor approval.
      </p>

      {locationHint ? (
        <p style={{ color: "var(--pink)", margin: 0 }}>{locationHint}</p>
      ) : null}
      {message ? <p style={{ color: "var(--gold)" }}>{message}</p> : null}
    </div>
  );
}
