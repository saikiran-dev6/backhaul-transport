"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell, Stat } from "@/components/DashboardShell";
import { EmptyState, LoadingState, RouteLine, StatusBadge } from "@/components/ui";

type Request = {
  id: string;
  pickupName: string;
  dropName: string;
  goodsType: string;
  weightKg: number;
  quantity: number;
  status: string;
  imageUrl?: string;
  bookings: Array<{
    id: string;
    price: number;
    pickupOtp: string;
    deliveryOtp: string;
    pickupStatus: string;
    deliveryStatus: string;
    trip: { driver: { user: { fullName: string } }; vehicle: { vehicleType: string } };
  }>;
};

export function GoodsDashboard() {
  const [data, setData] = useState<{ requests: Request[]; active: number; totalWeight: number } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((response) => response.json()).then(setData);
  }, []);

  return (
    <DashboardShell
      role="LoadMate"
      title="Loads on the move."
      copy="See goods requests, vehicle matches, pickup and delivery OTPs, proof status and total capacity used."
      actions={[{ label: "Send goods", href: "/book/goods" }, { label: "Booking history", href: "/history" }]}
    >
      {!data ? (
        <LoadingState label="Loading LoadMate dashboard…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Goods requests" value={data.requests.length} />
            <Stat label="Active" value={data.active} />
            <Stat label="Weight placed" value={`${data.totalWeight} kg`} />
          </div>

          <h2 className="mb-4 mt-10 text-2xl font-black">Goods activity</h2>
          {data.requests.length ? (
            <div className="grid gap-4">
              {data.requests.map((request) => (
                <article className="card grid gap-5 lg:grid-cols-[1fr_auto]" key={request.id}>
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <strong>{request.goodsType.replaceAll("_", " ")} · {request.weightKg} kg · {request.quantity} item(s)</strong>
                      <StatusBadge status={request.status} />
                    </div>
                    <RouteLine from={request.pickupName} to={request.dropName} />
                    {request.imageUrl && <a className="mt-3 inline-block text-xs font-bold text-brand-700" target="_blank" href={request.imageUrl}>View goods photo</a>}
                  </div>

                  {request.bookings.length ? (
                    <div className="min-w-64 rounded-2xl bg-slate-50 p-4">
                      {request.bookings.map((booking) => (
                        <div key={booking.id}>
                          <strong>{booking.trip.driver.user.fullName} · {booking.trip.vehicle.vehicleType}</strong>
                          <p className="mt-1 text-sm">Fixed price ₹{booking.price}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <span>Pickup <b className="block font-mono text-base">{booking.pickupOtp}</b></span>
                            <span>Delivery <b className="block font-mono text-base">{booking.deliveryOtp}</b></span>
                          </div>
                          <Link className="btn-primary mt-3 w-full !py-2" href={`/tracking/goods/${booking.id}`}>Track goods</Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Awaiting a vehicle booking</div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No LoadMate requests yet" copy="Add a goods route, photo, weight and size to receive permitted nearby-route matches." />
          )}
        </>
      )}
    </DashboardShell>
  );
}
