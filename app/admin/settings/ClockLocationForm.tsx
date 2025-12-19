"use client";

import { FormEvent, ChangeEvent, useEffect, useMemo, useState } from "react";
import type { AllowedLocation } from "@/lib/clock";

type ClockLocationFormProps = {
  location: AllowedLocation;
};

type Status = {
  type: "saving" | "success" | "error";
  message: string;
};

const DEFAULT_LOCATION: AllowedLocation = {
  lat: 41.736258,
  lng: -111.857516,
  radiusMeters: 150,
  label: "Campus",
  isEnabled: false,
};

const toInputValue = (value?: number) => (typeof value === "number" && Number.isFinite(value) ? value.toString() : "");

export default function ClockLocationForm({ location }: ClockLocationFormProps) {
  const initial = location ?? DEFAULT_LOCATION;
  const [persistedLocation, setPersistedLocation] = useState<AllowedLocation>(initial);
  const [isEnabled, setIsEnabled] = useState(initial.isEnabled);
  const [formValues, setFormValues] = useState({
    label: initial.label ?? "",
    lat: toInputValue(initial.lat),
    lng: toInputValue(initial.lng),
    radiusMeters: toInputValue(initial.radiusMeters),
  });
  const [status, setStatus] = useState<Status | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const next = location ?? DEFAULT_LOCATION;
    setPersistedLocation(next);
    setIsEnabled(next.isEnabled);
    setFormValues({
      label: next.label ?? "",
      lat: toInputValue(next.lat),
      lng: toInputValue(next.lng),
      radiusMeters: toInputValue(next.radiusMeters),
    });
    setStatus(null);
  }, [location]);

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setStatus(null);
  };

  const parsedCoordinates = useMemo(() => {
    const lat = Number(formValues.lat);
    const lng = Number(formValues.lng);
    const radiusMeters = Number(formValues.radiusMeters);
    return {
      lat: Number.isFinite(lat) ? lat : persistedLocation.lat,
      lng: Number.isFinite(lng) ? lng : persistedLocation.lng,
      radiusMeters: Number.isFinite(radiusMeters) ? radiusMeters : persistedLocation.radiusMeters,
    };
  }, [formValues.lat, formValues.lng, formValues.radiusMeters, persistedLocation]);

  const mapUrl = useMemo(() => {
    const coords = parsedCoordinates;
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed`;
  }, [parsedCoordinates]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ type: "saving", message: "Saving..." });
    setIsSaving(true);

    const lat = Number(formValues.lat);
    const lng = Number(formValues.lng);
    const radiusMeters = Number(formValues.radiusMeters);

    if (isEnabled && (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusMeters))) {
      setStatus({
        type: "error",
        message: "Latitude, longitude, and radius are required when enforcement is enabled.",
      });
      setIsSaving(false);
      return;
    }

    const payload = {
      label: formValues.label.trim() || null,
      isEnabled,
      lat: isEnabled ? lat : persistedLocation.lat,
      lng: isEnabled ? lng : persistedLocation.lng,
      radiusMeters: isEnabled ? radiusMeters : persistedLocation.radiusMeters,
    };

    try {
      const response = await fetch("/api/clock-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const saved = await response.json();
      if (!response.ok) {
        throw new Error(saved?.error ?? "Unable to save the campus location.");
      }

      const nextLocation: AllowedLocation = {
        lat: saved.lat,
        lng: saved.lng,
        radiusMeters: saved.radiusMeters,
        label: saved.label,
        isEnabled: saved.isEnabled,
      };
      if (saved.id) nextLocation.id = saved.id;
      if (saved.updatedAt) nextLocation.updatedAt = saved.updatedAt;

      setPersistedLocation(nextLocation);
      setIsEnabled(nextLocation.isEnabled);
      setFormValues({
        label: nextLocation.label ?? "",
        lat: toInputValue(nextLocation.lat),
        lng: toInputValue(nextLocation.lng),
        radiusMeters: toInputValue(nextLocation.radiusMeters),
      });
      setStatus({ type: "success", message: "Saved successfully." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save the campus location.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = useMemo(
    () => ({
      padding: 10,
      border: "1px solid var(--border)",
      borderRadius: 6,
      background: isEnabled ? "#fff" : "#f4f4f6",
    }),
    [isEnabled],
  );

  const enforcementCopy = isEnabled
    ? `Students must be within ${parsedCoordinates.radiusMeters} meters of this point to start the timer.`
    : "Location enforcement is disabled, so the timer can be started anywhere.";

  return (
    <form
      onSubmit={handleSave}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Campus clock-in location</h1>
          <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
            Choose the point that determines where students must be to start the timer.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
            minWidth: 200,
          }}
        >
          <span style={{ fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Location enforcement
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => {
                setIsEnabled((prev) => !prev);
                setStatus(null);
              }}
              aria-label="Toggle campus clock-in enforcement"
            />
            <span className="slider" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save decision"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Label</span>
            <input
              name="label"
              value={formValues.label}
              onChange={handleFieldChange}
              placeholder="Main campus"
              style={inputStyle}
              readOnly={!isEnabled}
              aria-readonly={!isEnabled}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Latitude</span>
              <input
                name="lat"
                type="number"
                step="0.000001"
                value={formValues.lat}
                onChange={handleFieldChange}
                required={isEnabled}
                style={inputStyle}
                readOnly={!isEnabled}
                aria-readonly={!isEnabled}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Longitude</span>
              <input
                name="lng"
                type="number"
                step="0.000001"
                value={formValues.lng}
                onChange={handleFieldChange}
                required={isEnabled}
                style={inputStyle}
                readOnly={!isEnabled}
                aria-readonly={!isEnabled}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Radius (meters)</span>
              <input
                name="radiusMeters"
                type="number"
                min="25"
                value={formValues.radiusMeters}
                onChange={handleFieldChange}
                required={isEnabled}
                style={inputStyle}
                readOnly={!isEnabled}
                aria-readonly={!isEnabled}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#fff",
          }}
        >
          <strong style={{ fontSize: "1rem" }}>Map preview</strong>
          <div
            style={{
              border: "1px solid #dfe3ea",
              borderRadius: 10,
              overflow: "hidden",
              width: "100%",
              aspectRatio: "16 / 9",
            }}
          >
            <iframe
              title="Campus location"
              src={mapUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>{enforcementCopy}</p>
        </div>
      </div>

      {status ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${status.type === "error" ? "var(--pink)" : "var(--border)"}`,
            backgroundColor: status.type === "error" ? "#fff1f6" : "#f4f4f5",
          }}
        >
          <p style={{ margin: 0, color: status.type === "error" ? "var(--pink)" : "var(--text-muted)" }}>
            {status.message}
          </p>
        </div>
      ) : null}

      <style jsx>{`
        .switch {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          position: relative;
        }

        .switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: relative;
          width: 60px;
          height: 34px;
          border-radius: 999px;
          background: #dbe0e9;
          transition: background 0.25s ease;
          display: inline-flex;
          align-items: center;
          padding: 4px;
        }

        .slider::before {
          content: "";
          position: absolute;
          left: 4px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          transition: transform 0.25s ease;
        }

        .switch input:checked + .slider {
          background: #452b8a;
        }

        .switch input:checked + .slider::before {
          transform: translateX(26px);
        }

        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
