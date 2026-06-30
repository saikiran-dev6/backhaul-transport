import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestUser, otpCode } from "@/lib/auth";
import { db } from "@/lib/db";
import { passengerEligible } from "@/lib/matching";
import { passengerPrice } from "@/lib/pricing";
import { locationSchema } from "@/lib/validation";

const schema = z.object({ tripId: z.string(), pickup: locationSchema, drop: locationSchema, seats: z.number().int().min(1), paymentMethod: z.enum(["CASH", "UPI", "MOCK_CARD"]).default("CASH") });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (auth.role !== "ROUTEMATE") return NextResponse.json({ error: "RouteMate login required" }, { status: 403 });
  const bookings = await db.passengerBooking.findMany({ where: { passengerId: auth.userId }, include: { trip: { include: { vehicle: true, driver: { include: { user: { select: { id: true, fullName: true } } } } } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ROUTEMATE") return NextResponse.json({ error: "RouteMate login required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid booking" }, { status: 400 });
  const trip = await db.returnTrip.findUnique({ where: { id: parsed.data.tripId }, include: { vehicle: true, driver: true } });
  if (!trip || trip.status !== "ACTIVE") return NextResponse.json({ error: "Trip is no longer available" }, { status: 404 });
  const fit = passengerEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.seats);
  if (!fit.eligible) return NextResponse.json({ error: "Trip no longer satisfies route, seat, or permit rules" }, { status: 409 });
  const rule = await db.pricingRule.findFirst({ where: { vehicleType: { in: [trip.vehicle.vehicleType, "DEFAULT"] } }, orderBy: { vehicleType: "desc" } });
  if (!rule) return NextResponse.json({ error: "Pricing rule missing" }, { status: 500 });
  const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
  const price = passengerPrice({ distanceKm, detourKm: fit.detourKm, seatsRequested: parsed.data.seats, tripAvailableSeats: trip.availableSeats, vehicle: trip.vehicle, rule });
  const pickupOtp = otpCode();
  const booking = await db.$transaction(async (tx) => {
    const current = await tx.returnTrip.findUnique({ where: { id: trip.id } });
    if (!current || current.availableSeats < parsed.data.seats) throw new Error("Seats were just booked by another RouteMate");
    await tx.returnTrip.update({ where: { id: trip.id }, data: { availableSeats: { decrement: parsed.data.seats } } });
    const created = await tx.passengerBooking.create({ data: { tripId: trip.id, passengerId: auth.userId, seatsBooked: parsed.data.seats, pickupName: parsed.data.pickup.name, pickupLat: parsed.data.pickup.lat, pickupLng: parsed.data.pickup.lng, dropName: parsed.data.drop.name, dropLat: parsed.data.drop.lat, dropLng: parsed.data.drop.lng, fare: price.total, pickupOtp, bookingStatus: "CONFIRMED", paymentStatus: parsed.data.paymentMethod === "CASH" ? "PENDING" : "PAID", isLookingForRide: true } });
    const platformFee = price.total * (rule.platformFeePercent / (100 + rule.platformFeePercent));
    await tx.payment.create({ data: { bookingId: created.id, bookingType: "PASSENGER", amount: price.total, platformFee, driverEarning: price.total - platformFee, method: parsed.data.paymentMethod, status: parsed.data.paymentMethod === "CASH" ? "PENDING" : "PAID" } });
    return created;
  }).catch((error: Error) => null);
  if (!booking) return NextResponse.json({ error: "Seats were just booked. Search again." }, { status: 409 });
  return NextResponse.json({ booking, priceBreakdown: price.breakdown, message: "Seat confirmed" }, { status: 201 });
}
