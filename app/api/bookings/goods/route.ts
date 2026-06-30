import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestUser, otpCode } from "@/lib/auth";
import { db } from "@/lib/db";
import { goodsEligible } from "@/lib/matching";
import { goodsPrice } from "@/lib/pricing";
import { locationSchema } from "@/lib/validation";

const schema = z.object({ tripId: z.string(), pickup: locationSchema, drop: locationSchema, goodsType: z.string(), weightKg: z.number().positive(), quantity: z.number().int().positive(), sizeDescription: z.string(), imageUrl: z.string().optional(), isFragile: z.boolean(), requiresColdStorage: z.boolean(), isHeavy: z.boolean(), paymentMethod: z.enum(["CASH", "UPI", "MOCK_CARD"]).default("CASH") });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!["LOADMATE", "MERCHANT"].includes(auth.role)) return NextResponse.json({ error: "LoadMate or Merchant login required" }, { status: 403 });
  const bookings = await db.goodsBooking.findMany({ where: { goodsRequest: { senderId: auth.userId } }, include: { goodsRequest: true, trip: { include: { vehicle: true, driver: { include: { user: { select: { fullName: true } } } } } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || !["LOADMATE", "MERCHANT"].includes(auth.role)) return NextResponse.json({ error: "LoadMate login required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid booking" }, { status: 400 });
  const trip = await db.returnTrip.findUnique({ where: { id: parsed.data.tripId }, include: { vehicle: true, driver: true } });
  if (!trip || trip.status !== "ACTIVE") return NextResponse.json({ error: "Trip is no longer available" }, { status: 404 });
  const fit = goodsEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.weightKg, parsed.data.goodsType);
  if (!fit.eligible) return NextResponse.json({ error: "Trip no longer satisfies route, capacity, permit, or goods rules" }, { status: 409 });
  if (parsed.data.requiresColdStorage && !trip.vehicle.vehicleType.includes("REFRIGERATED")) return NextResponse.json({ error: "This vehicle has no cold storage" }, { status: 409 });
  const rule = await db.pricingRule.findFirst({ where: { vehicleType: { in: [trip.vehicle.vehicleType, "DEFAULT"] } }, orderBy: { vehicleType: "desc" } });
  if (!rule) return NextResponse.json({ error: "Pricing rule missing" }, { status: 500 });
  const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
  const price = goodsPrice({ distanceKm, detourKm: fit.detourKm, weightKg: parsed.data.weightKg, rule });
  const pickupOtp = otpCode();
  const deliveryOtp = otpCode();
  const booking = await db.$transaction(async (tx) => {
    const current = await tx.returnTrip.findUnique({ where: { id: trip.id } });
    if (!current || current.availableGoodsCapacityKg < parsed.data.weightKg) throw new Error("Capacity changed");
    await tx.returnTrip.update({ where: { id: trip.id }, data: { availableGoodsCapacityKg: { decrement: parsed.data.weightKg } } });
    const goodsRequest = await tx.goodsRequest.create({ data: { senderId: auth.userId, pickupName: parsed.data.pickup.name, pickupLat: parsed.data.pickup.lat, pickupLng: parsed.data.pickup.lng, dropName: parsed.data.drop.name, dropLat: parsed.data.drop.lat, dropLng: parsed.data.drop.lng, goodsType: parsed.data.goodsType, weightKg: parsed.data.weightKg, quantity: parsed.data.quantity, sizeDescription: parsed.data.sizeDescription, imageUrl: parsed.data.imageUrl, isFragile: parsed.data.isFragile, requiresColdStorage: parsed.data.requiresColdStorage, isHeavy: parsed.data.isHeavy, status: "BOOKED" } });
    const created = await tx.goodsBooking.create({ data: { goodsRequestId: goodsRequest.id, tripId: trip.id, price: price.total, pickupOtp, deliveryOtp } });
    const platformFee = price.total * (rule.platformFeePercent / (100 + rule.platformFeePercent));
    await tx.payment.create({ data: { bookingId: created.id, bookingType: "GOODS", amount: price.total, platformFee, driverEarning: price.total - platformFee, method: parsed.data.paymentMethod, status: parsed.data.paymentMethod === "CASH" ? "PENDING" : "PAID" } });
    return created;
  }).catch(() => null);
  if (!booking) return NextResponse.json({ error: "Vehicle capacity changed. Search again." }, { status: 409 });
  return NextResponse.json({ booking, priceBreakdown: price.breakdown, message: "Goods space confirmed" }, { status: 201 });
}
