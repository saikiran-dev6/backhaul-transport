"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarClock, PackagePlus, Repeat2 } from "lucide-react";
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
  createdAt: string;
  bookings: Array<{
    id: string;
    price: number;
    pickupOtp: string;
    deliveryOtp: string;
    deliveryStatus: string;
    trip: { driver: { user: { fullName: string } }; vehicle: { vehicleType: string } };
  }>;
};

export function MerchantDashboard() {
  const [data, setData] = useState<{ requests: Request[]; active: number; totalWeight: number } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((response) => response.json()).then(setData);
  }, []);

  const repeatRoutes = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const request of data?.requests || []) {
      const key = `${request.pickupName} → ${request.dropName}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [data?.requests]);

  return (
    <DashboardShell
      role="Merchant"
      title="Business goods movement."
      copy="Plan repeat shipments, track bulk loads, review payment status and reuse your most common Backhaul routes."
      actions={[{ label: "Send bulk goods", href: "/book/goods" }, { label: "Payment history", href: "/history" }]}
    >
      {!data ? (
        <LoadingState label="Loading Merchant dashboard…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Shipment requests" value={data.requests.length} />
            <Stat label="Active loads" value={data.active} />
            <Stat label="Total weight moved" value={`${data.totalWeight} kg`} />
            <Stat label="Repeat routes" value={repeatRoutes.length} />
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="card">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <Repeat2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-black">Repeat shipment routes</h2>
                  <p className="text-sm text-slate-500">Generated from your booking history.</p>
                </div>
              </div>
              {repeatRoutes.length ? (
                <div className="grid gap-3">
                  {repeatRoutes.map(([route, count]) => (
                    <div key={route} className="rounded-2xl bg-slate-50 p-4">
                      <strong>{route}</strong>
                      <p className="mt-1 text-sm text-slate-500">{count} shipment request{count > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No repeat routes yet" copy="Create your first bulk goods booking to start building business routes." />
              )}
            </section>

            <section className="grid gap-4">
              {[
                ["Bulk-ready matching", "Weight, goods type, detour and vehicle permit rules are checked before pricing.", PackagePlus],
                ["Planned dispatches", "Use dynamic pickup/drop search and preferred time windows for future loads.", CalendarClock],
                ["Business controls", "Payment history, proof of delivery and OTP handoffs stay connected to each shipment.", Building2],
              ].map(([title, copy, Icon]) => {
                const C = Icon as typeof PackagePlus;
                return (
                  <div key={String(title)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                    <C className="mb-4 h-6 w-6 text-eco-600" />
                    <strong>{String(title)}</strong>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{String(copy)}</p>
                  </div>
                );
              })}
            </section>
          </div>

          <h2 className="mb-4 mt-10 text-2xl font-black">Business booking history</h2>
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
                    <p className="mt-3 text-xs text-slate-500">Created {new Date(request.createdAt).toLocaleDateString("en-IN")}</p>
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
            <EmptyState title="No Merchant shipments yet" copy="Send a bulk goods request to see business shipment history here." />
          )}
        </>
      )}
    </DashboardShell>
  );
}
