"use client";
import Link from "next/link";import { useEffect,useState } from "react";import { DashboardShell,Stat } from "@/components/DashboardShell";import { EmptyState,LoadingState,RouteLine,StatusBadge } from "@/components/ui";
type Booking={id:string;fare:number;pickupOtp:string;bookingStatus:string;paymentStatus:string;createdAt:string;trip:{fromLocationName:string;toLocationName:string;departureTime:string;vehicle:{vehicleType:string};driver:{user:{fullName:string}}}};
export function PassengerDashboard(){
  const [data,setData]=useState<{bookings:Booking[];active:number;spent:number}|null>(null);
  const load = () => { fetch("/api/dashboard").then(r=>r.json()).then(setData); };
  useEffect(()=>{ load(); },[]);

  const cancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const res = await fetch("/api/bookings/passenger/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id }),
    });
    const d = await res.json();
    if (res.ok) {
      alert("Booking cancelled successfully");
      load();
    } else {
      alert(d.error || "Failed to cancel booking");
    }
  };

  const payNow = async (bookingId: string) => {
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, bookingType: "PASSENGER" }),
    });
    const d = await res.json();
    if (res.ok) {
      if (d.data?.isMock) {
        alert("DEMO MODE: Razorpay credentials pending. Payment order created safely without fake capture.");
      } else {
        alert(`Razorpay Order Created: ${d.data?.orderId}`);
      }
      load();
    } else {
      alert(d.error || "Failed to initiate payment");
    }
  };

  return <DashboardShell role="RouteMate" title="Your journeys, in one place." copy="Track active return seats, review OTPs and payments, and rate completed Captains." actions={[{label:"Book return seat",href:"/book/passenger"},{label:"Booking history",href:"/history"}]}>{!data?<LoadingState label="Loading RouteMate dashboard…"/>:<><div className="grid gap-4 sm:grid-cols-3"><Stat label="Bookings" value={data.bookings.length}/><Stat label="Active" value={data.active}/><Stat label="Total booked value" value={`₹${data.spent.toLocaleString("en-IN")}`}/></div><h2 className="mb-4 mt-10 text-2xl font-black">Recent bookings</h2>{data.bookings.length?<div className="grid gap-4">{data.bookings.map(b=><article className="card grid gap-4 md:grid-cols-[1fr_auto]" key={b.id}><div><div className="mb-3 flex flex-wrap items-center gap-2"><strong>{b.trip.driver.user.fullName}</strong><StatusBadge status={b.bookingStatus}/><StatusBadge status={b.bookingStatus === "COMPLETED" ? b.paymentStatus : "NOT YET DUE"}/></div><RouteLine from={b.trip.fromLocationName} to={b.trip.toLocationName}/><p className="mt-3 text-xs text-slate-500">{b.trip.vehicle.vehicleType} · {new Date(b.trip.departureTime).toLocaleString("en-IN")}</p></div><div className="flex min-w-44 flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><small className="font-bold text-slate-500">Pickup OTP</small><strong className="block font-mono text-xl">{b.pickupOtp}</strong></div><strong>₹{b.fare}</strong><div className="flex flex-col gap-2"><Link className="btn-primary !py-2" href={`/tracking/passenger/${b.id}`}>Track trip</Link>{b.bookingStatus === "COMPLETED" && b.paymentStatus === "UNPAID" && <button onClick={() => payNow(b.id)} className="btn-emerald !py-1.5 text-xs font-bold">Pay Now</button>}{!["COMPLETED", "CANCELLED"].includes(b.bookingStatus) && <button onClick={() => cancelBooking(b.id)} className="rounded-xl border border-red-200 bg-red-50 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100">Cancel booking</button>}</div></div></article>)}</div>:<EmptyState title="No RouteMate bookings yet" copy="Choose any pickup and drop to find a verified return seat."/>}</>}</DashboardShell>}
