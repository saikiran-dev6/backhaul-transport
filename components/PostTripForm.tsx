"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Plus, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { MapPicker } from "@/components/map/MapPicker";
import { LoadingState } from "@/components/ui";
import type { LocationPoint } from "@/types";

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  verificationStatus: string;
  passengerCapacity: number;
  goodsCapacityKg: number;
  permitType: string;
};

const future = () => {
  const date = new Date(Date.now() + 86400000);
  date.setHours(8, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function PostTripForm() {
  const [from, setFrom] = useState<LocationPoint>();
  const [to, setTo] = useState<LocationPoint>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleId: "",
    departureTime: future(),
    availableSeats: 0,
    availableGoodsCapacityKg: 0,
    maxDetourKm: 10,
    allowedPickupPoints: "",
    allowedDropPoints: "",
    allowedGoodsTypes: ["PARCEL", "BOXES"] as string[],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; routeDistanceKm: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()),
      fetch("/api/vehicles").then((response) => response.json()),
    ]).then(([me, vehicleData]) => {
      setDriverStatus(me.user?.driverProfile?.verificationStatus || "PENDING");
      const nextVehicles = vehicleData.vehicles || [];
      setVehicles(nextVehicles);
      const approved = nextVehicles.find((vehicle: Vehicle) => vehicle.verificationStatus === "APPROVED");
      if (approved) setForm((current) => ({ ...current, vehicleId: approved.id }));
    });
  }, []);

  const change = (key: string, value: string | number | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (item: string) => change("allowedGoodsTypes", form.allowedGoodsTypes.includes(item) ? form.allowedGoodsTypes.filter((type) => type !== item) : [...form.allowedGoodsTypes, item]);

  const submit = async () => {
    if (!from || !to) {
      setError("Choose both ends of the return route.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        from,
        to,
        departureTime: new Date(form.departureTime).toISOString(),
        allowedPickupPoints: form.allowedPickupPoints.split(",").map((item) => item.trim()).filter(Boolean),
        allowedDropPoints: form.allowedDropPoints.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (response.ok) setCreated(data.trip);
    else setError(data.error);
  };

  if (driverStatus === null) return <LoadingState label="Checking Captain verification…" />;

  if (driverStatus !== "APPROVED") {
    return (
      <div className="card mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-black">Verification pending</h2>
        <p className="mt-3 text-slate-600">
          Your Backhaul Captain verification is pending. You can access your dashboard but cannot post trips until approval.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/verification" className="btn-primary">Open verification</Link>
          <Link href="/dashboard/driver" className="btn-secondary">Captain dashboard</Link>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <div className="card mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-eco-600" />
        <h2 className="mt-4 text-3xl font-black">Return trip is live.</h2>
        <p className="mt-2 text-slate-600">The {created.routeDistanceKm} km route is now searchable by eligible RouteMates and LoadMates.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard/driver" className="btn-primary">Captain dashboard</Link>
          <button className="btn-secondary" onClick={() => setCreated(null)}>Post another</button>
        </div>
      </div>
    );
  }

  const selected = vehicles.find((vehicle) => vehicle.id === form.vehicleId);

  return (
    <div className="grid gap-6">
      <MapPicker pickup={from} drop={to} onChange={(type, point) => (type === "pickup" ? setFrom(point) : setTo(point))} />
      <div className="card grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Approved vehicle">
          <select className="field" value={form.vehicleId} onChange={(event) => change("vehicleId", event.target.value)}>
            <option value="">Choose vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id} disabled={vehicle.verificationStatus !== "APPROVED"}>
                {vehicle.vehicleNumber} · {vehicle.vehicleType} · {vehicle.verificationStatus}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Departure">
          <input className="field" type="datetime-local" value={form.departureTime} onChange={(event) => change("departureTime", event.target.value)} />
        </Field>
        <Field label="Max detour (km)">
          <input className="field" type="number" min="0" max="100" value={form.maxDetourKm} onChange={(event) => change("maxDetourKm", Number(event.target.value))} />
        </Field>
        <Field label={`Available seats (max ${selected?.passengerCapacity || 0})`}>
          <input className="field" type="number" min="0" max={selected?.passengerCapacity || 0} value={form.availableSeats} onChange={(event) => change("availableSeats", Number(event.target.value))} />
        </Field>
        <Field label={`Goods capacity kg (max ${selected?.goodsCapacityKg || 0})`}>
          <input className="field" type="number" min="0" max={selected?.goodsCapacityKg || 0} value={form.availableGoodsCapacityKg} onChange={(event) => change("availableGoodsCapacityKg", Number(event.target.value))} />
        </Field>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <strong>Permit guard</strong>
          <p className="mt-1 text-slate-500">{selected ? `${selected.permitType} service only. Incompatible requests are never matched.` : "Select an approved vehicle."}</p>
        </div>
        <Field label="Flexible pickup points (comma-separated)">
          <input className="field" value={form.allowedPickupPoints} onChange={(event) => change("allowedPickupPoints", event.target.value)} placeholder="Town centre, highway junction" />
        </Field>
        <Field label="Flexible drop points (comma-separated)">
          <input className="field" value={form.allowedDropPoints} onChange={(event) => change("allowedDropPoints", event.target.value)} placeholder="Market, bypass" />
        </Field>
        <div>
          <span className="label">Allowed goods types</span>
          <div className="flex flex-wrap gap-2">
            {["PARCEL", "GROCERIES", "BOXES", "FURNITURE", "AGRICULTURE", "MEDICINE"].map((type) => (
              <button type="button" onClick={() => toggle(type)} className={`rounded-lg px-2.5 py-2 text-xs font-bold ${form.allowedGoodsTypes.includes(type) ? "bg-eco-600 text-white" : "bg-slate-100 text-slate-600"}`} key={type}>
                {type}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 md:col-span-2 lg:col-span-3">
            {error} {error.includes("approval") && <Link className="underline" href="/verification">Open verification</Link>}
          </p>
        )}
        <button onClick={submit} disabled={busy || !form.vehicleId} className="btn-primary md:col-span-2 lg:col-span-3">
          <Route className="h-4 w-4" />
          {busy ? "Publishing dynamic trip…" : "Post return trip"}
        </button>
      </div>
      {!vehicles.length && <Link href="/verification" className="btn-secondary"><Plus className="h-4 w-4" /> Register a vehicle first</Link>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
