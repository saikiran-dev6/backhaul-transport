import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { validateGoodsDeliveryTransition } from "@/lib/bookingStateMachine";
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
  const booking = await db.goodsBooking.findUnique({
    where: { id: bookingId },
    include: { trip: { include: { driver: true } }, goodsRequest: true },
  });

  if (!booking) return apiError("Goods booking not found", 404);

  const isSender = booking.goodsRequest.senderId === auth.userId;
  const isCaptain = booking.trip.driver.userId === auth.userId;
  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";

  if (!isSender && !isCaptain && !isAdmin) {
    return apiError("Unauthorized to cancel this goods booking", 403);
  }

  if (booking.deliveryStatus === "CANCELLED") {
    return apiSuccess({ booking, isAlreadyCancelled: true }, "Goods booking is already cancelled");
  }

  try {
    validateGoodsDeliveryTransition(booking.deliveryStatus, "CANCELLED");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Illegal status transition";
    return apiError(msg, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.goodsBooking.update({
      where: { id: booking.id },
      data: {
        deliveryStatus: "CANCELLED",
      },
    });

    await tx.goodsRequest.update({
      where: { id: booking.goodsRequestId },
      data: { status: "CANCELLED" },
    });

    // Atomically restore reserved goods capacity on ReturnTrip
    await tx.returnTrip.update({
      where: { id: booking.tripId },
      data: {
        availableGoodsCapacityKg: { increment: booking.goodsRequest.weightKg },
      },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "GOODS_BOOKING_CANCELLED",
        status: "CANCELLED",
        message: `Goods booking ${booking.id} cancelled by ${auth.name}. Reason: ${reason || "User requested"}`,
      },
    });

    return b;
  });

  await logSecurityAudit("BOOKING_CANCELLED", {
    userId: auth.userId,
    metadata: { bookingId: booking.id, bookingType: "GOODS", reason },
  });

  await emitRealtime({
    event: "booking:cancelled",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "GOODS", status: "CANCELLED" },
  });

  await emitRealtime({
    event: "booking:cancelled",
    room: userRoom(booking.goodsRequest.senderId),
    payload: { bookingId: booking.id, bookingType: "GOODS", status: "CANCELLED" },
  });

  await emitRealtime({
    event: "trip:booking_cancelled",
    room: tripRoom(booking.tripId),
    payload: { bookingId: booking.id, capacityFreedKg: booking.goodsRequest.weightKg },
  });

  return apiSuccess({ booking: updated }, "Goods booking cancelled successfully");
}
