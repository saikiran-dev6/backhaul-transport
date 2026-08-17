"use client";

import type { ReactNode } from "react";
import { Stat } from "@/components/DashboardShell";
import { EmptyState, StatusBadge } from "@/components/ui";

export type AdminAnalytics = Record<string, number>;
export type AdminOverview = { users: any[]; trips: any[]; passengerBookings: any[]; goodsBookings: any[]; complaints: any[] };
export type AdminVerification = { drivers: any[]; vehicles: any[]; documents: any[] };
export type AdminPricingRule = { id: string; vehicleType: string; fuelPrice: number; baseFarePerKm: number; platformFeePercent: number; minimumFare: number; seatDiscountPercent: number; goodsWeightRate: number; driverBaseEarning: number; detourRatePerKm: number };

export const adminTabs = ["Analytics", "Users", "Verification", "Trips & bookings", "Pricing rules", "Complaints"];

export function AdminAnalyticsPanel({ data }: { data: AdminAnalytics }) {
  const entries = [
    ["Total users", data.users],
    ["Total trips", data.totalTrips],
    ["Active routes", data.activeRoutes],
    ["Empty seats filled", data.emptySeatsFilled],
    ["Goods capacity used", `${data.goodsCapacityUsedKg} kg`],
    ["Empty km reduced", `${data.estimatedEmptyKmReduced} km`],
    ["Captain earnings", `₹${data.totalDriverEarnings}`],
    ["Passengers served", data.totalPassengersServed],
    ["Goods deliveries", data.totalGoodsDeliveries],
    ["Pending Captains", data.pendingDrivers],
    ["Pending vehicles", data.pendingVehicles],
    ["Open complaints", data.openComplaints],
  ];

  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{entries.map(([label, value]) => <Stat key={String(label)} label={String(label)} value={value} />)}</div>;
}

export function AdminUsersPanel({ users }: { users: any[] }) {
  return <Table headers={["Name", "Username", "Contact", "Role", "OTP"]} rows={users.map((user) => [user.fullName, user.username, <span key={user.id}>{user.email}<small className="block text-slate-400">{user.phone}</small></span>, user.role, <StatusBadge key={`${user.id}-status`} status={user.otpVerified ? "APPROVED" : "PENDING"} />])} />;
}

export function AdminVerificationPanel({ data, onVerify }: { data: AdminVerification; onVerify: (target: string, id: string, status: string) => void }) {
  return (
    <div className="grid gap-6">
      <section>
        <h2 className="mb-3 text-xl font-black">Captains</h2>
        <Table headers={["Captain", "Licence", "Vehicles", "Status", "Action"]} rows={data.drivers.map((driver) => [<span key={driver.id}>{driver.user.fullName}<small className="block text-slate-400">{driver.user.email}</small></span>, driver.licenseNumber || "Not supplied", driver.vehicles.length, <StatusBadge key={`${driver.id}-s`} status={driver.verificationStatus} />, <Actions key={`${driver.id}-a`} onClick={(status) => onVerify("DRIVER", driver.id, status)} />])} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Vehicles</h2>
        <Table headers={["Vehicle", "Captain", "Permit", "Status", "Action"]} rows={data.vehicles.map((vehicle) => [`${vehicle.vehicleNumber} · ${vehicle.vehicleType}`, vehicle.driver.user.fullName, vehicle.permitType, <StatusBadge key={`${vehicle.id}-s`} status={vehicle.verificationStatus} />, <Actions key={`${vehicle.id}-a`} onClick={(status) => onVerify("VEHICLE", vehicle.id, status)} />])} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Documents</h2>
        {data.documents.length ? <Table headers={["Document", "Captain", "File", "Status", "Action"]} rows={data.documents.map((document) => [document.documentType, document.driver.user.fullName, <a key={`${document.id}-f`} className="font-bold text-brand-700" target="_blank" href={document.fileUrl}>Open</a>, <StatusBadge key={`${document.id}-s`} status={document.status} />, <Actions key={`${document.id}-a`} onClick={(status) => onVerify("DOCUMENT", document.id, status)} />])} /> : <EmptyState title="No documents submitted" />}
      </section>
    </div>
  );
}

export function AdminTripsPanel({ data }: { data: AdminOverview }) {
  return (
    <div className="grid gap-7">
      <section>
        <h2 className="mb-3 text-xl font-black">Dynamic trips</h2>
        <Table headers={["Route", "Captain / vehicle", "Departure", "Capacity", "Status"]} rows={data.trips.map((trip) => [<span key={trip.id}>{trip.fromLocationName}<small className="block text-slate-400">→ {trip.toLocationName}</small></span>, `${trip.driver.user.fullName} · ${trip.vehicle.vehicleNumber}`, new Date(trip.departureTime).toLocaleString("en-IN"), `${trip.availableSeats} seats / ${trip.availableGoodsCapacityKg} kg`, <StatusBadge key={`${trip.id}-s`} status={trip.status} />])} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Passenger bookings</h2>
        <Table headers={["RouteMate", "Route", "Seats", "Fare", "Status"]} rows={data.passengerBookings.map((booking) => [booking.passenger.fullName, `${booking.trip.fromLocationName} → ${booking.trip.toLocationName}`, booking.seatsBooked, `₹${booking.fare}`, <StatusBadge key={booking.id} status={booking.bookingStatus} />])} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Goods bookings</h2>
        <Table headers={["LoadMate", "Goods", "Route", "Price", "Delivery"]} rows={data.goodsBookings.map((booking) => [booking.goodsRequest.sender.fullName, `${booking.goodsRequest.goodsType} · ${booking.goodsRequest.weightKg} kg`, `${booking.trip.fromLocationName} → ${booking.trip.toLocationName}`, `₹${booking.price}`, <StatusBadge key={booking.id} status={booking.deliveryStatus} />])} />
      </section>
    </div>
  );
}

export function AdminPricingPanel({ rules, setRules, save }: { rules: AdminPricingRule[]; setRules: (rules: AdminPricingRule[]) => void; save: (rule: AdminPricingRule) => void }) {
  const update = (id: string, key: keyof AdminPricingRule, value: string) => setRules(rules.map((rule) => rule.id === id ? { ...rule, [key]: Number(value) } : rule));
  const fields: Array<[keyof AdminPricingRule, string]> = [
    ["fuelPrice", "Fuel ₹/L"],
    ["baseFarePerKm", "Base ₹/km"],
    ["platformFeePercent", "Platform %"],
    ["minimumFare", "Minimum ₹"],
    ["seatDiscountPercent", "Seat discount %"],
    ["goodsWeightRate", "Weight ₹/kg"],
    ["driverBaseEarning", "Captain base ₹"],
    ["detourRatePerKm", "Detour ₹/km"],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rules.map((rule) => (
        <article className="card !shadow-none" key={rule.id}>
          <h2 className="mb-4 text-xl font-black">{rule.vehicleType.replaceAll("_", " ")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([key, label]) => (
              <label key={key}>
                <span className="label text-xs">{label}</span>
                <input className="field" type="number" step="0.1" value={rule[key] as number} onChange={(event) => update(rule.id, key, event.target.value)} />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4 w-full" onClick={() => save(rule)}>Save live rule</button>
        </article>
      ))}
    </div>
  );
}

export function AdminComplaintsPanel({ complaints }: { complaints: any[] }) {
  return complaints.length ? <Table headers={["User", "Type", "Description", "Status"]} rows={complaints.map((complaint) => [complaint.user.fullName, complaint.complaintType, complaint.description, <StatusBadge key={complaint.id} status={complaint.status} />])} /> : <EmptyState title="No open complaints" copy="Safety and service complaints will appear here for Control Hub review." />;
}

function Actions({ onClick }: { onClick: (status: string) => void }) {
  return (
    <div className="flex gap-1">
      <button onClick={() => onClick("APPROVED")} className="rounded-lg bg-eco-50 px-2 py-1 text-xs font-black text-eco-700">Approve</button>
      <button onClick={() => onClick("REJECTED")} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-700">Reject</button>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>{headers.map((header) => <th className="px-4 py-3" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td className="px-4 py-3" key={cellIndex}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
