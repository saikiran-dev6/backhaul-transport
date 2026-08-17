import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/apiResponse";
import { getAppConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return apiSuccess({ results: [] }, "Enter at least two characters");

  const cfg = getAppConfig();

  // 1. Mapbox Geocoding Places API
  if (cfg.mapboxAccessToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=in&limit=5&access_token=${cfg.mapboxAccessToken}`;
      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (response.ok) {
        const json = await response.json();
        const results = (json.features || []).map((f: any) => ({
          name: f.place_name || f.text,
          lat: f.center[1],
          lng: f.center[0],
        }));
        if (results.length > 0) {
          return apiSuccess({ results, provider: "mapbox" }, "Locations loaded via Mapbox");
        }
      }
    } catch {
      // Fall through to next provider
    }
  }

  // 2. Google Maps Geocoding API
  if (cfg.googleMapsApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IN&key=${cfg.googleMapsApiKey}`;
      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (response.ok) {
        const json = await response.json();
        const results = (json.results || []).map((r: any) => ({
          name: r.formatted_address,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        }));
        if (results.length > 0) {
          return apiSuccess({ results, provider: "google" }, "Locations loaded via Google Maps");
        }
      }
    } catch {
      // Fall through to next provider
    }
  }

  // 3. OpenStreetMap Nominatim Fallback
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Backhaul-MVP/1.0" }, next: { revalidate: 3600 } }
    );
    if (!response.ok) throw new Error("Search unavailable");
    const data = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return apiSuccess({ results: data.map((item) => ({ name: item.display_name, lat: Number(item.lat), lng: Number(item.lon) })), provider: "nominatim" }, "Locations loaded");
  } catch {
    return apiSuccess({ results: [], provider: "offline" }, "Location search is offline; select a point directly on the map.");
  }
}
