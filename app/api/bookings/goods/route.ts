import { NextRequest } from "next/server";
import { requestUser, otpCode, hashOtp } from "@/lib/auth";
import { db } from "@/lib/db";
import { goodsEligible } from "@/lib/matching";
import { goodsPrice } from "@/lib/pricing";
import { goodsBookingSchema } from "@/lib/validation";
import { setGoodsRequestGeo } from "@/lib/postgis";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (!["LOADMATE", "MERCHANT"].includes(auth.role)) return apiError("LoadMate or Merchant login required", 403);
  const bookings = await db.goodsBooking.findMany({ where: { goodsRequest: { senderId: auth.userId } }, include: { goodsRequest: true, trip: { include: { vehicle: true, driver: { include: { user: { select: { fullName: true } } } } } } }, orderBy: { createdAt: "desc" } });
  return apiSuccess({ bookings }, "Goods bookings loaded");
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (!["LOADMATE", "MERCHANT"].includes(auth.role)) return apiError("LoadMate or Merchant login required", 403);
  const rawBody = await request.json();
  const parsed = goodsBookingSchema.safeParse(rawBody);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid booking", 400, parsed.error.issues);
  
  const idempotencyKey = request.headers.get("idempotency-key") || parsed.data.idempotencyKey;
  if (idempotencyKey) {
    const existing = await db.goodsBooking.findFirst({
      where: { idempotencyKey, goodsRequest: { senderId: auth.userId } },
      include: { goodsRequest: true, payments: true },
    });
    if (existing) {
      return apiSuccess({ booking: existing, isDuplicate: true }, "Goods booking retrieved (idempotent)");
    }
  }

  const trip = await db.returnTrip.findUnique({ where: { id: parsed.data.tripId }, include: { vehicle: true, driver: true } });
  if (!trip || trip.status !== "ACTIVE") return apiError("Trip is no longer available", 404);
  const fit = goodsEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.weightKg, parsed.data.goodsType);
  if (!fit.eligible) return apiError("Trip no longer satisfies route, capacity, permit, or goods rules", 409);
  if (parsed.data.requiresColdStorage && !trip.vehicle.vehicleType.includes("REFRIGERATED")) return apiError("This vehicle has no cold storage", 409);
  const rule = await db.pricingRule.findFirst({ where: { vehicleType: { in: [trip.vehicle.vehicleType, "DEFAULT"] } }, orderBy: { vehicleType: "desc" } });
  if (!rule) return apiError("Pricing rule missing", 500);
  const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
  const price = goodsPrice({ distanceKm, detourKm: fit.detourKm, weightKg: parsed.data.weightKg, rule, isFragile: parsed.data.isFragile, isHeavy: parsed.data.isHeavy, requiresColdStorage: parsed.data.requiresColdStorage });
  const pickupOtp = otpCode();
  const deliveryOtp = otpCode();
  const pickupOtpHash = hashOtp(pickupOtp);
  const deliveryOtpHash = hashOtp(deliveryOtp);

  const booking = await db.$transaction(async (tx) => {
    const reserved = await tx.returnTrip.updateMany({
      where: { id: trip.id, availableGoodsCapacityKg: { gte: parsed.data.weightKg }, isLookingForGoods: true },
      data: { availableGoodsCapacityKg: { decrement: parsed.data.weightKg } },
    });
    if (reserved.count === 0) throw new Error("Capacity changed");

    const goodsRequest = await tx.goodsRequest.create({
      data: {
        senderId: auth.userId,
        pickupName: parsed.data.pickup.name,
        pickupLat: parsed.data.pickup.lat,
        pickupLng: parsed.data.pickup.lng,
        dropName: parsed.data.drop.name,
        dropLat: parsed.data.drop.lat,
        dropLng: parsed.data.drop.lng,
        goodsType: parsed.data.goodsType,
        weightKg: parsed.data.weightKg,
        quantity: parsed.data.quantity,
        sizeDescription: parsed.data.sizeDescription,
        imageUrl: parsed.data.imageUrl,
        isFragile: parsed.data.isFragile,
        requiresColdStorage: parsed.data.requiresColdStorage,
        isHeavy: parsed.data.isHeavy,
        status: "BOOKED",
      },
    });

    const created = await tx.goodsBooking.create({
      data: {
        goodsRequestId: goodsRequest.id,
        tripId: trip.id,
        price: price.total,
        pickupOtp,
        pickupOtpHash,
        deliveryOtp,
        deliveryOtpHash,
        idempotencyKey: idempotencyKey || null,
        paymentStatus: parsed.data.paymentMethod === "CASH" ? "PENDING" : "UNPAID",
      },
    });

    const platformFee = price.total * (rule.platformFeePercent / (100 + rule.platformFeePercent));
    await tx.payment.create({
      data: {
        bookingId: created.id,
        bookingType: "GOODS",
        goodsBookingId: created.id,
        driverId: trip.driverId,
        captainPaymentAccountId: trip.driver.captainPaymentAccountId || null,
        amount: price.total,
        platformFee,
        driverEarning: price.total - platformFee,
        method: parsed.data.paymentMethod,
        status: "PENDING",
      },
    });

    return { booking: created, goodsRequestId: goodsRequest.id };
  }).catch(() => null);

  if (!booking) return apiError("Vehicle capacity changed. Search again.", 409);
  await setGoodsRequestGeo(db, booking.goodsRequestId, parsed.data.pickup.lng, parsed.data.pickup.lat, parsed.data.drop.lng, parsed.data.drop.lat);
  return apiSuccess({ booking: booking.booking, priceBreakdown: price.breakdown }, "Goods space confirmed", { status: 201 });
}
