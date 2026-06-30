import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (auth.role === "CAPTAIN") {
    const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId }, include: { vehicles: true } });
    if (!driver) return NextResponse.json({ driver: null, trips: [], bookings: [], earnings: 0 });
    const trips = await db.returnTrip.findMany({ where: { driverId: driver.id }, include: { vehicle: true, passengerBookings: { include: { passenger: { select: { fullName: true } } } }, goodsBookings: { include: { goodsRequest: true } } }, orderBy: { departureTime: "desc" } });
    const tripIds = trips.map((trip) => trip.id);
    const passengerIds = trips.flatMap((trip) => trip.passengerBookings.map((b) => b.id));
    const goodsIds = trips.flatMap((trip) => trip.goodsBookings.map((b) => b.id));
    const payments = await db.payment.findMany({ where: { OR: [{ bookingType: "PASSENGER", bookingId: { in: passengerIds } }, { bookingType: "GOODS", bookingId: { in: goodsIds } }] } });
    return NextResponse.json({ driver, trips, tripIds, earnings: payments.reduce((sum, item) => sum + item.driverEarning, 0), bookingsCount: passengerIds.length + goodsIds.length });
  }
  if (auth.role === "ROUTEMATE") {
    const bookings = await db.passengerBooking.findMany({ where: { passengerId: auth.userId }, include: { trip: { include: { vehicle: true, driver: { include: { user: true } } } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ bookings, active: bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.bookingStatus)).length, spent: bookings.reduce((sum, b) => sum + b.fare, 0) });
  }
  if (["LOADMATE", "MERCHANT"].includes(auth.role)) {
    const requests = await db.goodsRequest.findMany({ where: { senderId: auth.userId }, include: { bookings: { include: { trip: { include: { vehicle: true, driver: { include: { user: true } } } } } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ requests, active: requests.filter((r) => !["DELIVERED", "CANCELLED"].includes(r.status)).length, totalWeight: requests.reduce((sum, r) => sum + r.weightKg, 0) });
  }
  return NextResponse.json({ redirect: "/dashboard/admin" });
}
