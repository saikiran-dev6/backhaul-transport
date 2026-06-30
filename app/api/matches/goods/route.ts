import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/auth";
import { goodsEligible, recommendedVehicle } from "@/lib/matching";
import { maskVehicleNumber } from "@/lib/geo";
import { goodsPrice } from "@/lib/pricing";
import { locationSchema } from "@/lib/validation";
import { z } from "zod";

const schema = z.object({ pickup: locationSchema, drop: locationSchema, departureTime: z.string().datetime().optional(), goodsType: z.string().min(2), weightKg: z.number().positive(), quantity: z.number().int().positive(), sizeDescription: z.string().min(2), isFragile: z.boolean().default(false), requiresColdStorage: z.boolean().default(false), isHeavy: z.boolean().default(false) });

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Please login to access Backhaul services." }, { status: 401 });
  if (!["LOADMATE", "MERCHANT"].includes(auth.role)) return NextResponse.json({ error: "You do not have permission to access this module." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid search" }, { status: 400 });
  const selected = parsed.data.departureTime ? new Date(parsed.data.departureTime) : new Date();
  const trips = await db.returnTrip.findMany({ where: { status: "ACTIVE", departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 7 * 86400000) } }, include: { vehicle: true, driver: { include: { user: true } } } });
  const fallback = await db.pricingRule.findUnique({ where: { vehicleType: "DEFAULT" } });
  const matches = [];
  for (const trip of trips) {
    const fit = goodsEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.weightKg, parsed.data.goodsType);
    if (!fit.eligible) continue;
    if (parsed.data.requiresColdStorage && !trip.vehicle.vehicleType.includes("REFRIGERATED")) continue;
    const rule = (await db.pricingRule.findUnique({ where: { vehicleType: trip.vehicle.vehicleType } })) || fallback;
    if (!rule) continue;
    const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
    const priced = goodsPrice({ distanceKm, detourKm: fit.detourKm, weightKg: parsed.data.weightKg, rule });
    matches.push({ tripId: trip.id, driverName: trip.driver.user.fullName, vehicleType: trip.vehicle.vehicleType, vehicleNumber: maskVehicleNumber(trip.vehicle.vehicleNumber), rating: trip.driver.rating, departureTime: trip.departureTime, seatsAvailable: trip.availableSeats, goodsCapacityKg: trip.availableGoodsCapacityKg, pickupDistanceKm: fit.pickupDistanceKm, dropDistanceKm: fit.dropDistanceKm, detourKm: fit.detourKm, distanceKm, durationMin: Math.round(trip.estimatedDurationMin * fit.segmentProgress), fare: priced.total, priceBreakdown: priced.breakdown, from: { name: trip.fromLocationName, lat: trip.fromLat, lng: trip.fromLng }, to: { name: trip.toLocationName, lat: trip.toLat, lng: trip.toLng }, safetyBadge: trip.driver.verificationStatus === "APPROVED" });
  }
  matches.sort((a, b) => a.detourKm - b.detourKm || a.fare - b.fare || b.rating - a.rating || +new Date(a.departureTime) - +new Date(b.departureTime));
  return NextResponse.json({ matches, recommendedVehicle: recommendedVehicle(parsed.data.weightKg, parsed.data.sizeDescription) });
}
