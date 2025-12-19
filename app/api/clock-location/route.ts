import { NextResponse } from "next/server";
import { getClockLocation, upsertClockLocation } from "@/lib/clock";

export async function GET() {
  const location = await getClockLocation();
  return NextResponse.json(location);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const current = await getClockLocation();

  const parseNumber = (value: unknown, fallback: number) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  };

  const lat = parseNumber(body.lat, current.lat);
  const lng = parseNumber(body.lng, current.lng);
  const radiusMeters = parseNumber(body.radiusMeters, current.radiusMeters);
  const label =
    typeof body.label === "string" && body.label.trim().length > 0
      ? body.label.trim()
      : current.label;
  const isEnabled =
    typeof body.isEnabled === "boolean"
      ? body.isEnabled
      : current.isEnabled;

  if (isEnabled && (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusMeters))) {
    return NextResponse.json(
      { error: "Latitude, longitude, and radius must be valid numbers when enforcement is enabled." },
      { status: 400 },
    );
  }

  let saved;
  try {
    saved = await upsertClockLocation({
      lat,
      lng,
      radiusMeters,
      label,
      isEnabled,
    });
  } catch (error) {
    console.error("Failed to upsert clock location", error);
    return NextResponse.json(
      { error: "Unable to save location; check that the clockLocation table exists." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: saved.id,
    updatedAt: saved.updatedAt?.toISOString(),
    lat: saved.lat,
    lng: saved.lng,
    radiusMeters: saved.radiusMeters,
    label: saved.label,
    isEnabled: saved.isEnabled,
  });
}
