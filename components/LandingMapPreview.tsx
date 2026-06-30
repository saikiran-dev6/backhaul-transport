"use client";

import { useMemo, useState } from "react";
import { MapPicker } from "@/components/map/MapPicker";
import { haversineKm } from "@/lib/geo";
import type { LocationPoint } from "@/types";

export function LandingMapPreview() {
  const [pickup, setPickup] = useState<LocationPoint>(); const [drop, setDrop] = useState<LocationPoint>();
  const estimate = useMemo(() => pickup && drop ? haversineKm(pickup, drop) * 1.18 : 0, [pickup, drop]);
  return <div><MapPicker pickup={pickup} drop={drop} onChange={(type, point) => type === "pickup" ? setPickup(point) : setDrop(point)} />{estimate > 0 && <div className="relative z-10 mx-auto -mt-7 flex w-[90%] items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white shadow-xl"><span className="text-sm font-bold text-slate-300">Approximate road distance</span><strong className="text-xl">{estimate.toFixed(0)} km</strong></div>}</div>;
}
