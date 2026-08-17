import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { validateGoodsDeliveryTransition } from "@/lib/bookingStateMachine";
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
  const booking = await db.goodsBooking.findUnique({
    where: { id: bookingId },
    include: { trip: { include: { driver: true } }, goodsRequest: true },
  });

  if (!booking) return apiError("Goods booking not found", 404);

  const isCaptain = booking.trip.driver.userId === auth.userId;
  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";

  if (!isCaptain && !isAdmin) {
    return apiError("Only the assigned Captain can complete this goods booking", 403);
  }

  if (booking.deliveryStatus === "COMPLETED") {
    return apiSuccess({ booking, isAlreadyCompleted: true }, "Goods booking is already completed");
  }

  if (!booking.deliveryOtpVerifiedAt && booking.deliveryStatus !== "DELIVERED") {
    return apiError("Cannot complete goods delivery before delivery OTP is verified", 400);
  }

  try {
    validateGoodsDeliveryTransition(booking.deliveryStatus, "COMPLETED");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Illegal status transition";
    return apiError(msg, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.goodsBooking.update({
      where: { id: booking.id },
      data: {
        deliveryStatus: "COMPLETED",
      },
    });

    await tx.goodsRequest.update({
      where: { id: booking.goodsRequestId },
      data: { status: "COMPLETED" },
    });

    await tx.tripEvent.create({
      data: {
        tripId: booking.tripId,
        actorId: auth.userId,
        type: "GOODS_BOOKING_COMPLETED",
        status: "COMPLETED",
        message: `Goods booking ${booking.id} completed by Captain ${auth.name}`,
      },
    });

    return b;
  });

  await logSecurityAudit("BOOKING_COMPLETED", {
    userId: auth.userId,
    metadata: { bookingId: booking.id, bookingType: "GOODS" },
  });

  await emitRealtime({
    event: "booking:completed",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "GOODS", status: "COMPLETED" },
  });

  await emitRealtime({
    event: "booking:completed",
    room: userRoom(booking.goodsRequest.senderId),
    payload: { bookingId: booking.id, bookingType: "GOODS", status: "COMPLETED" },
  });

  await emitRealtime({
    event: "trip:booking_completed",
    room: tripRoom(booking.tripId),
    payload: { bookingId: booking.id },
  });

  await emitRealtime({
    event: "payment:due",
    room: bookingRoom(booking.id),
    payload: { bookingId: booking.id, bookingType: "GOODS", amount: booking.price },
  });

  await emitRealtime({
    event: "payment:due",
    room: userRoom(booking.goodsRequest.senderId),
    payload: { bookingId: booking.id, bookingType: "GOODS", amount: booking.price },
  });

  return apiSuccess({ booking: updated }, "Goods booking completed successfully");
}
