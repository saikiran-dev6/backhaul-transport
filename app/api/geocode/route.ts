import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Backhaul-MVP/1.0" }, next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("Search unavailable");
    const data = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return NextResponse.json({ results: data.map((item) => ({ name: item.display_name, lat: Number(item.lat), lng: Number(item.lon) })) });
  } catch {
    return NextResponse.json({ results: [], message: "Location search is offline; select a point directly on the map." });
  }
}
