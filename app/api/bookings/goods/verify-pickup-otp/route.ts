import { NextRequest } from "next/server";
import { requestUser, verifyOtpHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { goodsPickupOtpVerifySchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);

  const parsed = goodsPickupOtpVerifySchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid OTP payload", 400, parsed.error.issues);

  const booking = await db.goodsBooking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { trip: { include: { driver: true } }, goodsRequest: true },
  });

  if (!booking) return apiError("Goods booking not found", 404);
  if (booking.trip.driver.userId !== auth.userId) return apiError("You can only verify OTPs for your own trips", 403);
  if (booking.pickupOtpVerifiedAt) return apiSuccess({ booking, isAlreadyVerified: true }, "Goods pickup OTP already verified");

  if (booking.otpAttemptCount >= 5) {
    return apiError("Too many failed OTP attempts. Contact support.", 429);
  }

  if (!verifyOtpHash(parsed.data.otp, booking.pickupOtpHash, booking.pickupOtp)) {
    await db.goodsBooking.update({
      where: { id: booking.id },
      data: { otpAttemptCount: { increment: 1 } },
    });
    return apiError("Invalid goods pickup OTP. Verification failed.", 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.goodsBooking.update({
      where: { id: booking.id },
      data: { pickupOtpVerifiedAt: new Date(), pickupStatus: "PICKED_UP" },
    });

    await tx.goodsRequest.update({
      where: { id: booking.goodsRequestId },
      data: { status: "IN_TRANSIT" },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "GOODS_PICKUP_OTP_VERIFIED",
        status: "PICKED_UP",
        message: `Goods pickup OTP verified for booking ${booking.id}`,
      },
    });

    return b;
  });

  return apiSuccess({ booking: updated }, "Goods pickup OTP verified successfully");
}
