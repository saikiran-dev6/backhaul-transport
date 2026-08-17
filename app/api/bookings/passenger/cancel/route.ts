import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { validatePassengerBookingTransition } from "@/lib/bookingStateMachine";
import { emitRealtime, bookingRoom, tripRoom, userRoom } from "@/lib/realtime";
import { logSecurityAudit } from "@/lib/auditLog";

const cancelSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json().catch(() => null);
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid request payload", 400, parsed.error.issues);
  }

  const { bookingId, reason } = parsed.data;
  const booking = await db.passengerBooking.findUnique({
    where: { id: bookingId },
    include: { trip: { include: { driver: true } } },
  });

  if (!booking) return apiError("Passenger booking not found", 404);

  const isPassenger = booking.passengerId === auth.userId;
  const isCaptain = booking.trip.driver.userId === auth.userId;
  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";

  if (!isPassenger && !isCaptain && !isAdmin) {
    return apiError("Unauthorized to cancel this booking", 403);
  }

  if (booking.bookingStatus === "CANCELLED") {
    return apiSuccess({ booking, isAlreadyCancelled: true }, "Booking is already cancelled");
  }

  try {
    validatePassengerBookingTransition(booking.bookingStatus, "CANCELLED");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Illegal status transition";
    return apiError(msg, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.passengerBooking.update({
      where: { id: booking.id },
      data: {
        bookingStatus: "CANCELLED",
        isLookingForRide: false,
      },
    });

    // Atomically restore reserved seats on ReturnTrip
    await tx.returnTrip.update({
      where: { id: booking.tripId },
      data: {
        availableSeats: { increment: booking.seatsBooked },
      },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "PASSENGER_BOOKING_CANCELLED",
        status: "CANCELLED",
        message: `Passenger booking ${booking.id} cancelled by ${auth.name}. Reason: ${reason || "User requested"}`,
      },
    });

    return b;
  });

  await logSecurityAudit("BOOKING_CANCELLED", {
    userId: auth.userId,
    metadata: { bookingId: booking.id, bookingType: "PASSENGER", reason },
  });

  await emitRealtime({
    event: "booking:cancelled",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", status: "CANCELLED" },
  });

  await emitRealtime({
    event: "booking:cancelled",
    room: userRoom(booking.passengerId),
    payload: { bookingId: booking.id, bookingType: "PASSENGER", status: "CANCELLED" },
  });

  await emitRealtime({
    event: "trip:booking_cancelled",
    room: tripRoom(booking.tripId),
    payload: { bookingId: booking.id, seatsFreed: booking.seatsBooked },
  });

  return apiSuccess({ booking: updated }, "Passenger booking cancelled successfully");
}
