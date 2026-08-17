import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { validatePassengerBookingTransition } from "@/lib/bookingStateMachine";
import { emitRealtime, bookingRoom, tripRoom, userRoom } from "@/lib/realtime";
import { logSecurityAudit } from "@/lib/auditLog";

const completeSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
});

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json().catch(() => null);
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid request payload", 400, parsed.error.issues);
  }

  const { bookingId } = parsed.data;
  const booking = await db.passengerBooking.findUnique({
    where: { id: bookingId },
    include: { trip: { include: { driver: true } } },
  });

  if (!booking) return apiError("Passenger booking not found", 404);

  const isCaptain = booking.trip.driver.userId === auth.userId;
  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";

  if (!isCaptain && !isAdmin) {
    return apiError("Only the assigned Captain can complete this passenger booking", 403);
  }

  if (booking.bookingStatus === "COMPLETED") {
    return apiSuccess({ booking, isAlreadyCompleted: true }, "Booking is already completed");
  }

  if (!booking.pickupOtpVerifiedAt && booking.bookingStatus !== "PICKED_UP") {
    return apiError("Cannot complete booking before pickup OTP is verified", 400);
  }

  try {
    validatePassengerBookingTransition(booking.bookingStatus, "COMPLETED");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Illegal status transition";
    return apiError(msg, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.passengerBooking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: "COMPLETED",
        isLookingForRide: false,
      },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "PASSENGER_BOOKING_COMPLETED",
        status: "COMPLETED",
        message: `Passenger booking ${booking.id} completed by Captain ${auth.name}`,
      },
    });

    return b;
  });

  await logSecurityAudit("BOOKING_COMPLETED", {
    userId: auth.userId,
    metadata: { bookingId: booking.id, bookingType: "PASSENGER" },
  });

  await emitRealtime({
    event: "booking:completed",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", status: "COMPLETED" },
  });

  await emitRealtime({
    event: "booking:completed",
    room: userRoom(booking.passengerId),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", status: "COMPLETED" },
  });

  await emitRealtime({
    event: "trip:booking_completed",
    room: tripRoom(booking.tripId),
    payload: { bookingId: booking.id },
  });

  await emitRealtime({
    event: "payment:due",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", amount: booking.fare },
  });

  await emitRealtime({
    event: "payment:due",
    room: userRoom(booking.passengerId),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", amount: booking.fare },
  });

  return apiSuccess({ booking: updated }, "Passenger booking completed successfully");
}
