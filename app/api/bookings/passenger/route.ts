import { NextRequest } from "next/server";
import { requestUser, otpCode, hashOtp } from "@/lib/auth";
import { db } from "@/lib/db";
import { passengerEligible } from "@/lib/matching";
import { passengerPrice } from "@/lib/pricing";
import { passengerBookingSchema } from "@/lib/validation";
import { setPassengerBookingGeo } from "@/lib/postgis";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (auth.role !== "ROUTEMATE") return apiError("RouteMate login required", 403);
  const bookings = await db.passengerBooking.findMany({ where: { passengerId: auth.userId }, include: { trip: { include: { vehicle: true, driver: { include: { user: { select: { id: true, fullName: true } } } } } } }, orderBy: { createdAt: "desc" } });
  return apiSuccess({ bookings }, "Passenger bookings loaded");
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (auth.role !== "ROUTEMATE") return apiError("RouteMate login required", 403);
  const rawBody = await request.json();
  const parsed = passengerBookingSchema.safeParse(rawBody);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid booking", 400, parsed.error.issues);
  
  const idempotencyKey = request.headers.get("idempotency-key") || parsed.data.idempotencyKey;
  if (idempotencyKey) {
    const existing = await db.passengerBooking.findFirst({
      where: { idempotencyKey, passengerId: auth.userId },
      include: { payments: true },
    });
    if (existing) {
      return apiSuccess({ booking: existing, isDuplicate: true }, "Seat booking retrieved (idempotent)");
    }
  }

  const trip = await db.returnTrip.findUnique({ where: { id: parsed.data.tripId }, include: { vehicle: true, driver: true } });
  if (!trip || trip.status !== "ACTIVE") return apiError("Trip is no longer available", 404);
  const fit = passengerEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.seats);
  if (!fit.eligible) return apiError("Trip no longer satisfies route, seat, or permit rules", 409);
  const rule = await db.pricingRule.findFirst({ where: { vehicleType: { in: [trip.vehicle.vehicleType, "DEFAULT"] } }, orderBy: { vehicleType: "desc" } });
  if (!rule) return apiError("Pricing rule missing", 500);
  const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
  const price = passengerPrice({ distanceKm, detourKm: fit.detourKm, seatsRequested: parsed.data.seats, tripAvailableSeats: trip.availableSeats, vehicle: trip.vehicle, rule });
  const pickupOtp = otpCode();
  const pickupOtpHash = hashOtp(pickupOtp);

  const booking = await db.$transaction(async (tx) => {
    const reserved = await tx.returnTrip.updateMany({
      where: { id: trip.id, availableSeats: { gte: parsed.data.seats }, isLookingForPassengers: true },
      data: { availableSeats: { decrement: parsed.data.seats } },
    });
    if (reserved.count === 0) throw new Error("Seats were just booked by another RouteMate");

    const created = await tx.passengerBooking.create({
      data: {
        tripId: trip.id,
        passengerId: auth.userId,
        seatsBooked: parsed.data.seats,
        pickupName: parsed.data.pickup.name,
        pickupLat: parsed.data.pickup.lat,
        pickupLng: parsed.data.pickup.lng,
        dropName: parsed.data.drop.name,
        dropLat: parsed.data.drop.lat,
        dropLng: parsed.data.drop.lng,
        fare: price.total,
        pickupOtp,
        pickupOtpHash,
        idempotencyKey: idempotencyKey || null,
        bookingStatus: "CONFIRMED",
        paymentStatus: parsed.data.paymentMethod === "CASH" ? "PENDING" : "UNPAID",
        isLookingForRide: true,
      },
    });

    const platformFee = price.total * (rule.platformFeePercent / (100 + rule.platformFeePercent));
    await tx.payment.create({
      data: {
        bookingId: created.id,
        bookingType: "PASSENGER",
        passengerBookingId: created.id,
        driverId: trip.driverId,
        captainPaymentAccountId: trip.driver.captainPaymentAccountId || null,
        amount: price.total,
        platformFee,
        driverEarning: price.total - platformFee,
        method: parsed.data.paymentMethod,
        status: "PENDING",
      },
    });
    return created;
  }).catch(() => null);

  if (!booking) return apiError("Seats were just booked. Search again.", 409);
  await setPassengerBookingGeo(db, booking.id, parsed.data.pickup.lng, parsed.data.pickup.lat, parsed.data.drop.lng, parsed.data.drop.lat);
  return apiSuccess({ booking, priceBreakdown: price.breakdown }, "Seat confirmed", { status: 201 });
}
