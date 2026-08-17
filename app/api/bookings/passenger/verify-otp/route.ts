import { NextRequest } from "next/server";
import { requestUser, verifyOtpHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { passengerOtpVerifySchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  if (auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);

  const parsed = passengerOtpVerifySchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid OTP payload", 400, parsed.error.issues);

  const booking = await db.passengerBooking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { trip: { include: { driver: true } } },
  });

  if (!booking) return apiError("Passenger booking not found", 404);
  if (booking.trip.driver.userId !== auth.userId) return apiError("You can only verify OTPs for your own trips", 403);
  if (booking.pickupOtpVerifiedAt) return apiSuccess({ booking, isAlreadyVerified: true }, "Passenger pickup OTP already verified");

  if (booking.otpAttemptCount >= 5) {
    return apiError("Too many failed OTP attempts. Contact support.", 429);
  }

  if (!verifyOtpHash(parsed.data.otp, booking.pickupOtpHash, booking.pickupOtp)) {
    await db.passengerBooking.update({
      where: { id: booking.id },
      data: { otpAttemptCount: { increment: 1 } },
    });
    return apiError("Invalid pickup OTP. Verification failed.", 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.passengerBooking.update({
      where: { id: booking.id },
      data: { pickupOtpVerifiedAt: new Date(), bookingStatus: "PICKED_UP" },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "PASSENGER_PICKUP_OTP_VERIFIED",
        status: "PICKED_UP",
        message: `Passenger pickup OTP verified for booking ${booking.id}`,
      },
    });

    return b;
  });

  return apiSuccess({ booking: updated }, "Passenger pickup OTP verified successfully");
}
