"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Luggage, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPicker } from "@/components/map/MapPicker";
import { EmptyState, LoadingState } from "@/components/ui";
import { VehicleCard } from "@/components/VehicleCard";
import { useRouteSocket } from "@/components/hooks/useRouteSocket";
import type { LocationPoint, RouteMatch } from "@/types";

const tomorrow = () => {
  const date = new Date(Date.now() + 86400000);
  date.setHours(9, 30, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function PassengerBookingFlow() {
  const [pickup, setPickup] = useState<LocationPoint>();
  const [drop, setDrop] = useState<LocationPoint>();
  const [departureTime, setDepartureTime] = useState(tomorrow);
  const [seats, setSeats] = useState(1);
  const [luggageSize, setLuggageSize] = useState("SMALL");
  const [matches, setMatches] = useState<RouteMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [emptyCopy, setEmptyCopy] = useState("No Backhaul Captains are available on this route right now. Try changing time, nearby pickup, or drop location.");
  const [booking, setBooking] = useState<{ id: string; pickupOtp: string; fare: number } | null>(null);
  const [busy, setBusy] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("CASH");
  const [onlineNotice, setOnlineNotice] = useState("");

  const payload = useMemo(() => pickup && drop ? { pickup, drop, departureTime: new Date(departureTime).toISOString(), seats, luggageSize, isLookingForRide: true } : null, [pickup, drop, departureTime, seats, luggageSize]);

  const runSearch = useCallback(async (showLoading = false) => {
    if (!payload) {
      setError("Select both pickup and drop on the map.");
      return;
    }
    if (showLoading) setLoading(true);
    setError("");
    setBooking(null);
    setOnlineNotice("");
    const response = await fetch("/api/matches/passenger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMatches(data.matches || []);
    setEmptyCopy(data.emptyState || "No Backhaul Captains are available on this route right now. Try changing time, nearby pickup, or drop location.");
    setError(data.error || "");
    setLoading(false);
  }, [payload]);

  const search = async () => {
    setLive(true);
    await runSearch(true);
  };

  useRouteSocket({ pickup, drop, enabled: live && !booking, onAvailability: () => void runSearch(false), onTripStatus: () => void runSearch(false) });

  useEffect(() => {
    if (!live || !payload || booking) return;
    const timer = window.setInterval(() => void runSearch(false), 30000);
    return () => window.clearInterval(timer);
  }, [booking, live, payload, runSearch]);

  const book = async (match: RouteMatch) => {
    if (!pickup || !drop) return;
    setBusy(match.tripId);
    setError("");
    setOnlineNotice("");
    const response = await fetch("/api/bookings/passenger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: match.tripId, pickup, drop, seats, paymentMethod }),
    });
    const data = await response.json();
    if (response.ok) {
      setBooking(data.booking);
      if (paymentMethod === "ONLINE") {
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: data.booking.id, bookingType: "PASSENGER" }),
        });
        const orderData = await orderRes.json();
        if (orderRes.ok && orderData.data?.isMock) {
          setOnlineNotice("Online payment is currently in DEMO mode because Razorpay keys are not configured. Payment status remains PENDING until online credentials are set or cash is confirmed.");
        }
      }
    } else {
      setError(data.error === "RouteMate login required" ? "Log in as a RouteMate to confirm this booking." : data.error);
    }
    setBusy("");
  };

  if (booking) {
    return (
      <div className="card mx-auto max-w-2xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-eco-50 text-eco-600"><CheckCircle2 className="h-8 w-8" /></span>
        <p className="eyebrow mt-5">Booking confirmed</p>
        <h2 className="text-3xl font-black">Your return seat is ready.</h2>
        <p className="mt-3 text-slate-600">Show pickup OTP <strong className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-ink">{booking.pickupOtp}</strong> to the Captain.</p>
        {paymentMethod === "CASH" ? (
          <p className="mt-2 text-sm font-bold text-amber-700 bg-amber-50 rounded-lg p-2 max-w-md mx-auto">Cash payment of ₹{booking.fare} is PENDING Captain confirmation upon arrival.</p>
        ) : (
          <p className="mt-2 text-sm font-bold text-blue-700 bg-blue-50 rounded-lg p-2 max-w-md mx-auto">{onlineNotice || "Online payment initialized. Complete checkout to confirm payment."}</p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="btn-primary" href={`/tracking/passenger/${booking.id}`}>Track Captain <ArrowRight className="h-4 w-4" /></Link>
          <Link className="btn-secondary" href="/dashboard/passenger">View dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <MapPicker pickup={pickup} drop={drop} onChange={(type, location) => type === "pickup" ? setPickup(location) : setDrop(location)} vehicles={matches?.map((match) => ({ ...match.from, label: `${match.vehicleType} · ${match.driverName}` }))} />
      <div className="card grid gap-4 md:grid-cols-4">
        <label><span className="label">Departure</span><input className="field" type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label>
        <label><span className="label">Seats</span><span className="relative block"><Users className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><select className="field !pl-10" value={seats} onChange={(event) => setSeats(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></span></label>
        <label><span className="label">Luggage</span><span className="relative block"><Luggage className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><select className="field !pl-10" value={luggageSize} onChange={(event) => setLuggageSize(event.target.value)}><option>SMALL</option><option>MEDIUM</option><option>LARGE</option></select></span></label>
        <button className="btn-primary self-end" onClick={search} disabled={loading}><Search className="h-4 w-4" /> Find return seats</button>
      </div>
      <div className="card p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="eyebrow mb-2">Select Payment Method</p>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" name="passengerPayMethod" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} /> <span>Cash (Pay directly to Captain)</span></label>
          <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="radio" name="passengerPayMethod" value="ONLINE" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} /> <span>Online (Razorpay / Digital)</span></label>
        </div>
      </div>

      {live && <p className="rounded-xl bg-eco-50 p-3 text-sm font-bold text-eco-700">Live search is active. Captain availability refreshes automatically.</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error} {error.startsWith("Log in") && <Link className="underline" href="/login">Login here</Link>}</p>}
      {loading ? (
        <LoadingState />
      ) : matches && (
        matches.length ? (
          <div className="grid gap-4">
            <div><p className="eyebrow">{matches.length} currently available captain{matches.length !== 1 ? "s" : ""}</p><h2 className="section-title">Verified return vehicles</h2></div>
            {matches.map((match) => <VehicleCard key={match.tripId} match={match} mode="passenger" onBook={() => book(match)} busy={busy === match.tripId} />)}
          </div>
        ) : (
          <EmptyState title="No Captains looking for passengers right now" copy={emptyCopy} />
        )
      )}
    </div>
  );
}
