import type { LocationPoint } from "@/types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Pick<LocationPoint, "lat" | "lng">, b: Pick<LocationPoint, "lat" | "lng">) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Projects a point to a route segment using a local equirectangular plane.
export function pointToRoute(point: LocationPoint, start: LocationPoint, end: LocationPoint) {
  const meanLat = ((start.lat + end.lat + point.lat) / 3) * (Math.PI / 180);
  const xy = (p: LocationPoint) => ({
    x: p.lng * 111.32 * Math.cos(meanLat),
    y: p.lat * 110.574,
  });
  const p = xy(point);
  const a = xy(start);
  const b = xy(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT = lengthSquared ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared : 0;
  const t = Math.max(0, Math.min(1, rawT));
  const nearest = { x: a.x + t * dx, y: a.y + t * dy };
  return { distanceKm: Math.hypot(p.x - nearest.x, p.y - nearest.y), progress: t };
}

export function routeDistanceEstimateKm(start: LocationPoint, end: LocationPoint) {
  return Math.round(haversineKm(start, end) * 1.18 * 10) / 10;
}

export function maskVehicleNumber(value: string) {
  if (value.length < 6) return `***${value.slice(-2)}`;
  return `${value.slice(0, 2)} ** ** ${value.slice(-4)}`;
}
