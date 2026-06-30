"use client";

import dynamic from "next/dynamic";
import { Crosshair, MapPin, Search } from "lucide-react";
import { useState } from "react";
import type { LocationPoint } from "@/types";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false, loading: () => <div className="grid h-[360px] place-items-center bg-slate-100 font-bold text-slate-500">Loading free map…</div> });

type Props = { pickup?: LocationPoint; drop?: LocationPoint; vehicles?: Array<LocationPoint & { label?: string }>; onChange: (type: "pickup" | "drop", location: LocationPoint) => void };

export function MapPicker({ pickup, drop, vehicles, onChange }: Props) {
  const [active, setActive] = useState<"pickup" | "drop">("pickup");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [searching, setSearching] = useState(false);
  const search = async () => { if (query.trim().length < 2) return; setSearching(true); const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`); const data = await response.json(); setResults(data.results || []); setSearching(false); };
  const choose = (point: LocationPoint) => { onChange(active, point); setResults([]); setQuery(""); if (active === "pickup") setActive("drop"); };
  const locate = () => navigator.geolocation?.getCurrentPosition((position) => { const point = { name: "Current location", lat: position.coords.latitude, lng: position.coords.longitude }; onChange(active, point); if (active === "pickup") setActive("drop"); });
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
    <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex rounded-xl bg-slate-100 p-1">{(["pickup", "drop"] as const).map((type) => <button type="button" key={type} onClick={() => setActive(type)} className={`rounded-lg px-3 py-2 text-xs font-black capitalize transition ${active === type ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}>{type}</button>)}</div>
      <div className="relative"><div className="flex"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), search())} placeholder={`Search ${active} anywhere in India`} className="field !rounded-r-none" /><button type="button" onClick={search} className="grid w-12 place-items-center rounded-r-xl bg-brand-600 text-white" aria-label="Search location"><Search className={`h-4 w-4 ${searching ? "animate-pulse" : ""}`} /></button></div>{results.length > 0 && <div className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-56 overflow-auto rounded-xl border bg-white p-1 shadow-xl">{results.map((item) => <button type="button" key={`${item.lat}-${item.lng}`} onClick={() => choose(item)} className="flex w-full gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-brand-50"><MapPin className="h-4 w-4 shrink-0 text-brand-600" /><span>{item.name}</span></button>)}</div>}</div>
      <button type="button" onClick={locate} className="btn-secondary !px-3" title="Use current location"><Crosshair className="h-4 w-4" /><span className="sm:hidden xl:inline">Current location</span></button>
    </div>
    <div className="h-[360px]"><LeafletMap pickup={pickup} drop={drop} active={active} vehicles={vehicles} onPick={(type, point) => { onChange(type, point); if (type === "pickup") setActive("drop"); }} /></div>
    <div className="grid gap-2 bg-slate-50 p-3 text-xs sm:grid-cols-2"><div className="truncate rounded-lg bg-white px-3 py-2"><b className="text-brand-700">Pickup:</b> {pickup?.name || "Search or tap the map"}</div><div className="truncate rounded-lg bg-white px-3 py-2"><b className="text-eco-700">Drop:</b> {drop?.name || "Search or tap the map"}</div></div>
  </div>;
}
