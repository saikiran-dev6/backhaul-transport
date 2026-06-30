"use client";

import type { ReactNode } from "react";
import { CalendarClock, Gauge, MapPinned, Package, Radio, Star, Users } from "lucide-react";
import type { RouteMatch } from "@/types";
import { PriceBreakdown, RouteLine, VerifiedBadge } from "@/components/ui";

export function VehicleCard({ match, mode, onBook, busy }: { match: RouteMatch; mode: "passenger" | "goods"; onBook: () => void; busy?: boolean }) {
  return (
    <article className="card grid gap-5 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">{match.driverName}</h3>
              <VerifiedBadge />
              {mode === "passenger" && match.isLookingForPassengers && (
                <span className="inline-flex items-center gap-1 rounded-full bg-eco-50 px-2.5 py-1 text-xs font-black text-eco-700">
                  <Radio className="h-3.5 w-3.5" /> Looking now
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">{match.vehicleType.replaceAll("_", " ")} · {match.vehicleNumber}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-700">
            <Star className="h-4 w-4 fill-current" /> {match.rating.toFixed(1)}
          </div>
        </div>
        <RouteLine from={match.from.name} to={match.to.name} />
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Meta icon={<CalendarClock />} label="Departure" value={new Date(match.departureTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
          <Meta icon={mode === "passenger" ? <Users /> : <Package />} label={mode === "passenger" ? "Seats left" : "Space left"} value={mode === "passenger" ? `${match.seatsAvailable}` : `${match.goodsCapacityKg} kg`} />
          <Meta icon={<MapPinned />} label="Route distance" value={`${match.distanceKm.toFixed(0)} km`} />
          <Meta icon={<Gauge />} label="Extra detour" value={`${match.detourKm.toFixed(1)} km`} />
        </div>
      </div>
      <div className="space-y-3">
        <PriceBreakdown fare={match.fare} breakdown={match.priceBreakdown} />
        <button disabled={busy} onClick={onBook} className="btn-primary w-full">{busy ? "Confirming…" : mode === "passenger" ? "Book this seat" : "Book this space"}</button>
      </div>
    </article>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-xs">
      <span className="mb-2 flex items-center gap-1.5 font-bold text-slate-400 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}{label}</span>
      <strong className="line-clamp-2 text-slate-700">{value}</strong>
    </div>
  );
}
