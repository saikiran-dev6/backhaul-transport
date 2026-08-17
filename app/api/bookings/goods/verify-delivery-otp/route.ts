import { NextRequest } from "next/server";
import { requestUser, verifyOtpHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { goodsDeliveryOtpVerifySchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const parsed = goodsDeliveryOtpVerifySchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid OTP payload", 400, parsed.error.issues);

  const booking = await db.goodsBooking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { trip: { include: { driver: true } }, goodsRequest: true },
  });

  if (!booking) return apiError("Goods booking not found", 404);

  const isCaptain = booking.trip.driver.userId === auth.userId;
  const isSender = booking.goodsRequest.senderId === auth.userId;
  if (!isCaptain && !isSender && auth.accountRole !== "ADMIN" && auth.role !== "ADMIN") {
    return apiError("Unauthorized to verify delivery OTP for this shipment", 403);
  }

  if (booking.deliveryOtpVerifiedAt) return apiSuccess({ booking, isAlreadyVerified: true }, "Goods delivery OTP already verified");

  if (booking.otpAttemptCount >= 5) {
    return apiError("Too many failed OTP attempts. Contact support.", 429);
  }

  if (!verifyOtpHash(parsed.data.otp, booking.deliveryOtpHash, booking.deliveryOtp)) {
    await db.goodsBooking.update({
      where: { id: booking.id },
      data: { otpAttemptCount: { increment: 1 } },
    });
    return apiError("Invalid delivery OTP. Verification failed.", 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.goodsBooking.update({
      where: { id: booking.id },
      data: { deliveryOtpVerifiedAt: new Date(), deliveryStatus: "DELIVERED" },
    });

    await tx.goodsRequest.update({
      where: { id: booking.goodsRequestId },
      data: { status: "COMPLETED" },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "GOODS_DELIVERY_OTP_VERIFIED",
        status: "DELIVERED",
        message: `Goods delivery OTP verified for booking ${booking.id}`,
      },
    });

    return b;
  });

  return apiSuccess({ booking: updated }, "Goods delivery OTP verified successfully");
}
