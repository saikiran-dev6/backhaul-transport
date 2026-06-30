import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/auth";
import { passengerEligible } from "@/lib/matching";
import { maskVehicleNumber } from "@/lib/geo";
import { passengerPrice } from "@/lib/pricing";
import { locationSchema } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ pickup: locationSchema, drop: locationSchema, departureTime: z.string().datetime(), seats: z.number().int().min(1).max(8), luggageSize: z.string().default("SMALL"), isLookingForRide: z.boolean().default(true) });

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Please login to access Backhaul services." }, { status: 401 });
  if (auth.role !== "ROUTEMATE") return NextResponse.json({ error: "You do not have permission to access this module." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid search" }, { status: 400 });
  if (!parsed.data.isLookingForRide) return NextResponse.json({ matches: [], reason: "Passenger is not currently looking for a ride" });
  const selected = new Date(parsed.data.departureTime);
  const trips = await db.returnTrip.findMany({ where: { status: "ACTIVE", isLookingForPassengers: true, departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 36 * 3600000) } }, include: { vehicle: true, driver: { include: { user: true } } } });
  const fallback = await db.pricingRule.findUnique({ where: { vehicleType: "DEFAULT" } });
  const matches = [];
  for (const trip of trips) {
    const fit = passengerEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.seats);
    if (!fit.eligible) continue;
    const rule = (await db.pricingRule.findUnique({ where: { vehicleType: trip.vehicle.vehicleType } })) || fallback;
    if (!rule) continue;
    const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
    const priced = passengerPrice({ distanceKm, detourKm: fit.detourKm, seatsRequested: parsed.data.seats, tripAvailableSeats: trip.availableSeats, vehicle: trip.vehicle, rule });
    matches.push({ tripId: trip.id, driverName: trip.driver.user.fullName, vehicleType: trip.vehicle.vehicleType, vehicleNumber: maskVehicleNumber(trip.vehicle.vehicleNumber), rating: trip.driver.rating, departureTime: trip.departureTime, seatsAvailable: trip.availableSeats, goodsCapacityKg: trip.availableGoodsCapacityKg, pickupDistanceKm: fit.pickupDistanceKm, dropDistanceKm: fit.dropDistanceKm, detourKm: fit.detourKm, distanceKm, durationMin: Math.round(trip.estimatedDurationMin * fit.segmentProgress), fare: priced.total, priceBreakdown: priced.breakdown, from: { name: trip.fromLocationName, lat: trip.fromLat, lng: trip.fromLng }, to: { name: trip.toLocationName, lat: trip.toLat, lng: trip.toLng }, isLookingForPassengers: trip.isLookingForPassengers, safetyBadge: trip.driver.verificationStatus === "APPROVED" });
  }
  matches.sort((a, b) => a.detourKm - b.detourKm || a.fare - b.fare || b.rating - a.rating || +new Date(a.departureTime) - +new Date(b.departureTime));
  return NextResponse.json({ matches });
}
