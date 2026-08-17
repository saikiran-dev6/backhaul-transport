import type { LocationPoint } from "@/types";
import { getAppConfig } from "./config";

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

export async function calculateRouteEtaInfo(origin: LocationPoint, destination: LocationPoint) {
  const cfg = getAppConfig();

  // Mapbox Directions API for driving ETA & distance
  if (cfg.mapboxAccessToken) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${cfg.mapboxAccessToken}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const route = json.routes?.[0];
        if (route) {
          return {
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMinutes: Math.round(route.duration / 60),
            provider: "mapbox",
          };
        }
      }
    } catch {
      // Fall through to Haversine fallback
    }
  }

  // Haversine fallback ETA (assuming 45 km/h average speed in transit)
  const distKm = routeDistanceEstimateKm(origin, destination);
  const durationMins = Math.max(5, Math.round((distKm / 45) * 60));
  return {
    distanceKm: distKm,
    durationMinutes: durationMins,
    provider: "haversine",
  };
}

export function maskVehicleNumber(value: string) {
  if (value.length < 6) return `***${value.slice(-2)}`;
  return `${value.slice(0, 2)} ** ** ${value.slice(-4)}`;
}
