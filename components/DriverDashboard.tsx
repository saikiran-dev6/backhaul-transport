"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { DashboardShell, Stat } from "@/components/DashboardShell";
import { EmptyState, LoadingState, RouteLine, StatusBadge } from "@/components/ui";
import { useDriverGps } from "@/components/hooks/useDriverGps";

type Trip = {
  id: string;
  fromLocationName: string;
  toLocationName: string;
  departureTime: string;
  availableSeats: number;
  availableGoodsCapacityKg: number;
  routeDistanceKm: number;
  isLookingForPassengers: boolean;
  isLookingForGoods: boolean;
  status: string;
  vehicle: { vehicleNumber: string; vehicleType: string };
  passengerBookings: Array<{ id: string; seatsBooked: number; fare: number; bookingStatus: string; paymentStatus?: string; passenger: { fullName: string } }>;
  goodsBookings: Array<{ id: string; price: number; deliveryStatus: string; paymentStatus?: string; goodsRequest: { goodsType: string; weightKg: number; pickupName: string; dropName: string } }>;
};

type Data = {
  driver: { verificationStatus: string; rating: number; totalTrips: number; vehicles: Array<unknown> } | null;
  trips: Trip[];
  earnings: number;
  bookingsCount: number;
};

export function DriverDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [busyTrip, setBusyTrip] = useState("");
  const drivingTripId = data?.trips.find((trip) => trip.status === "DRIVING")?.id;
  const gps = useDriverGps(drivingTripId);

  const load = () => fetch("/api/dashboard").then((response) => response.json()).then(setData);

  useEffect(() => {
    void load();
  }, []);

  const togglePassengers = async (trip: Trip) => {
    setBusyTrip(trip.id);
    const response = await fetch(`/api/trips/${trip.id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLookingForPassengers: !trip.isLookingForPassengers }),
    });
    const result = await response.json();
    setBusyTrip("");
    if (!response.ok) {
      alert(result.error || "Could not update availability");
      return;
    }
    setData((current) => current ? { ...current, trips: current.trips.map((item) => item.id === trip.id ? { ...item, isLookingForPassengers: result.trip.isLookingForPassengers } : item) } : current);
  };

  const updateStatus = async (trip: Trip, status: string) => {
    setBusyTrip(trip.id);
    const response = await fetch(`/api/trips/${trip.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    setBusyTrip("");
    if (!response.ok) {
      alert(result.error || "Could not update trip status");
      return;
    }
    setData((current) => current ? { ...current, trips: current.trips.map((item) => item.id === trip.id ? { ...item, status: result.trip.status } : item) } : current);
  };

  return (
    <DashboardShell
      role="Backhaul Captain"
      title="Useful returns and earnings."
      copy="Every trip, request and earning below comes from stored Captain activity."
      actions={[{ label: "Post return trip", href: "/post-trip" }, { label: "Vehicle & documents", href: "/verification" }]}
    >
      {!data ? (
        <LoadingState label="Loading Captain dashboard…" />
      ) : !data.driver ? (
        <EmptyState title="Captain profile not found" copy="Register as a Backhaul Captain to continue." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Verification" value={data.driver.verificationStatus} />
            <Stat label="Driver rating" value={data.driver.rating.toFixed(1)} />
            <Stat label="Bookings matched" value={data.bookingsCount} />
            <Stat label="Earnings" value={`₹${data.earnings.toLocaleString("en-IN")}`} />
          </div>

          {data.driver.verificationStatus !== "APPROVED" && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              Your Backhaul Captain verification is pending. You can access your dashboard but cannot post trips until approval.{" "}
              <Link className="underline" href="/verification">Complete or review verification</Link>.
            </div>
          )}

          {drivingTripId && (
            <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold ${gps.active ? "border-eco-200 bg-eco-50 text-eco-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {gps.active
                ? `Live GPS streaming every 5 seconds. Last ping: ${gps.lastPoint ? new Date(gps.lastPoint.sentAt).toLocaleTimeString("en-IN") : "starting..."}`
                : gps.error || "Starting GPS stream for the active DRIVING trip..."}
            </div>
          )}

          <h2 className="mb-4 mt-10 text-2xl font-black">Posted return trips & matching requests</h2>
          {data.trips.length ? (
            <div className="grid gap-5">
              {data.trips.map((trip) => (
                <article className="card" key={trip.id}>
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <strong>{trip.vehicle.vehicleNumber} · {trip.vehicle.vehicleType}</strong>
                        <StatusBadge status={trip.status} />
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${trip.isLookingForPassengers ? "bg-eco-50 text-eco-700" : "bg-slate-100 text-slate-500"}`}>
                          <Radio className="h-3.5 w-3.5" /> {trip.isLookingForPassengers ? "Looking for passengers" : "Full / hidden from passenger search"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${trip.isLookingForGoods ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
                          Goods {trip.isLookingForGoods ? "visible" : "hidden"}
                        </span>
                      </div>
                      <RouteLine from={trip.fromLocationName} to={trip.toLocationName} />
                      <p className="mt-3 text-xs text-slate-500">
                        {trip.routeDistanceKm} km · {new Date(trip.departureTime).toLocaleString("en-IN")} · {trip.availableSeats} seats / {trip.availableGoodsCapacityKg} kg left
                      </p>
                    </div>
                    <div className="grid min-w-64 gap-3">
                      <button
                        className={trip.isLookingForPassengers ? "btn-secondary" : "btn-primary"}
                        disabled={busyTrip === trip.id}
                        onClick={() => togglePassengers(trip)}
                      >
                        {busyTrip === trip.id ? "Updating…" : trip.isLookingForPassengers ? "Mark full" : "Look for passengers"}
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <Stat label="RouteMates" value={trip.passengerBookings.length} />
                        <Stat label="LoadMates" value={trip.goodsBookings.length} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {["DRIVING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
                          <button key={status} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-brand-50 hover:text-brand-700" disabled={busyTrip === trip.id} onClick={() => updateStatus(trip, status)}>
                            {status.replaceAll("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-t pt-5 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-black text-brand-700">Passenger requests</h3>
                      {trip.passengerBookings.length ? (
                        trip.passengerBookings.map((booking) => (
                          <div key={booking.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 p-3 text-sm">
                            <div>
                              <strong>{booking.passenger.fullName}</strong> · {booking.seatsBooked} seat(s) · ₹{booking.fare}
                              <div className="mt-1 flex items-center gap-2">
                                <StatusBadge status={booking.bookingStatus} />
                                <StatusBadge status={booking.bookingStatus === "COMPLETED" ? (booking.paymentStatus || "UNPAID") : "Awaiting Completion"} />
                              </div>
                            </div>
                            {booking.bookingStatus === "COMPLETED" && booking.paymentStatus !== "PAID" && (
                              <button
                                onClick={async () => {
                                  const res = await fetch("/api/payments/confirm-cash", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ bookingId: booking.id, bookingType: "PASSENGER" }),
                                  });
                                  const d = await res.json();
                                  if (res.ok) { alert(d.message || "Cash confirmed"); window.location.reload(); }
                                  else alert(d.error || "Cash confirmation failed");
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Confirm Cash
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No RouteMate bookings on this trip.</p>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-black text-eco-700">Goods requests</h3>
                      {trip.goodsBookings.length ? (
                        trip.goodsBookings.map((booking) => (
                          <div key={booking.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-eco-50 p-3 text-sm">
                            <div>
                              <strong>{booking.goodsRequest.goodsType}</strong> · {booking.goodsRequest.weightKg} kg · ₹{booking.price}
                              <div className="mt-1 flex items-center gap-2">
                                <StatusBadge status={booking.deliveryStatus} />
                                <StatusBadge status={booking.deliveryStatus === "COMPLETED" ? (booking.paymentStatus || "UNPAID") : "Awaiting Completion"} />
                              </div>
                            </div>
                            {booking.deliveryStatus === "COMPLETED" && booking.paymentStatus !== "PAID" && (
                              <button
                                onClick={async () => {
                                  const res = await fetch("/api/payments/confirm-cash", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ bookingId: booking.id, bookingType: "GOODS" }),
                                  });
                                  const d = await res.json();
                                  if (res.ok) { alert(d.message || "Cash confirmed"); window.location.reload(); }
                                  else alert(d.error || "Cash confirmation failed");
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Confirm Cash
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No LoadMate bookings on this trip.</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No return trips posted" copy="Once approved, post any route and choose its available seats, goods space and detour." />
          )}
        </>
      )}
    </DashboardShell>
  );
}
