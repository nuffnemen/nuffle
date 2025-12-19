import { prisma } from "./prisma";

export type AllowedLocation = {
  id?: string;
  updatedAt?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  label?: string | null;
  isEnabled: boolean;
};

const DEFAULT_LOCATION: AllowedLocation = {
  id: "default",
  updatedAt: "1970-01-01T00:00:00.000Z",
  lat: 41.736258,
  lng: -111.857516,
  radiusMeters: 150,
  label: "Campus",
  isEnabled: false,
};

export async function getClockLocation(): Promise<AllowedLocation> {
  try {
    const location = await prisma.clockLocation.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!location) return DEFAULT_LOCATION;
    return {
      id: location.id,
      updatedAt: location.updatedAt?.toISOString(),
      lat: location.lat,
      lng: location.lng,
      radiusMeters: location.radiusMeters,
      label: location.label,
      isEnabled: location.isEnabled,
    };
  } catch {
    return DEFAULT_LOCATION;
  }
}

export async function upsertClockLocation(payload: AllowedLocation) {
  const existing = await prisma.clockLocation.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.clockLocation.update({
      where: { id: existing.id },
      data: {
        ...payload,
        label: payload.label ?? null,
      },
    });
  }

  return prisma.clockLocation.create({
    data: {
      lat: payload.lat,
      lng: payload.lng,
      radiusMeters: payload.radiusMeters,
      label: payload.label ?? null,
      isEnabled: payload.isEnabled,
    },
  });
}
