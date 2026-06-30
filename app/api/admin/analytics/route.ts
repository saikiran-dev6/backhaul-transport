import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Control Hub access required" }, { status: 403 });
  const [users, trips, activeRoutes, passengerAgg, goods, payments, pendingDrivers, pendingVehicles, complaints] = await Promise.all([
    db.user.count(), db.returnTrip.count(), db.returnTrip.count({ where: { status: "ACTIVE" } }),
    db.passengerBooking.aggregate({ _sum: { seatsBooked: true }, _count: true }),
    db.goodsRequest.aggregate({ _sum: { weightKg: true }, _count: true }),
    db.payment.aggregate({ where: { status: { in: ["PAID", "PENDING"] } }, _sum: { driverEarning: true } }),
    db.driverProfile.count({ where: { verificationStatus: "PENDING" } }), db.vehicle.count({ where: { verificationStatus: "PENDING" } }), db.complaint.count({ where: { status: "OPEN" } }),
  ]);
  const routeKm = await db.returnTrip.aggregate({ _sum: { routeDistanceKm: true } });
  return NextResponse.json({ analytics: { users, totalTrips: trips, activeRoutes, emptySeatsFilled: passengerAgg._sum.seatsBooked || 0, totalPassengersServed: passengerAgg._count, goodsCapacityUsedKg: goods._sum.weightKg || 0, totalGoodsDeliveries: goods._count, estimatedEmptyKmReduced: Math.round((routeKm._sum.routeDistanceKm || 0) * 0.62), totalDriverEarnings: Math.round(payments._sum.driverEarning || 0), pendingDrivers, pendingVehicles, openComplaints: complaints } });
}
