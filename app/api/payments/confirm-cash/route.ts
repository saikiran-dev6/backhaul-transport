import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { validatePaymentTransition } from "@/lib/paymentStateMachine";
import { logSecurityAudit } from "@/lib/auditLog";
import { checkRateLimit } from "@/lib/rateLimit";

const confirmCashSchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  bookingType: z.enum(["PASSENGER", "GOODS"]),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rate = await checkRateLimit(`payment_cash_${ip}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many cash confirmation requests. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json().catch(() => null);
  const parsed = confirmCashSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid request body", 400, parsed.error.issues);
  }

  const { bookingId, bookingType } = parsed.data;

  let assignedDriverUserId: string | null = null;
  let driverProfileId: string | null = null;
  let captainPaymentAccountId: string | null = null;
  let currentPaymentStatus = "PENDING";

  let customerUserId: string | null = null;
  let tripId: string | null = null;

  if (bookingType === "PASSENGER") {
    const booking = await db.passengerBooking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { driver: true } } },
    });
    if (!booking) return apiError("Passenger booking not found", 404);
    if (booking.bookingStatus !== "COMPLETED") {
      return apiError("Payment is not due until trip is completed", 400);
    }
    assignedDriverUserId = booking.trip.driver.userId;
    driverProfileId = booking.trip.driverId;
    captainPaymentAccountId = booking.trip.driver.captainPaymentAccountId || null;
    currentPaymentStatus = booking.paymentStatus;
    customerUserId = booking.passengerId;
    tripId = booking.tripId;
  } else {
    const booking = await db.goodsBooking.findUnique({
      where: { id: bookingId },
      include: { goodsRequest: true, trip: { include: { driver: true } } },
    });
    if (!booking) return apiError("Goods booking not found", 404);
    if (booking.deliveryStatus !== "COMPLETED") {
      return apiError("Payment is not due until delivery is completed", 400);
    }
    assignedDriverUserId = booking.trip.driver.userId;
    driverProfileId = booking.trip.driverId;
    captainPaymentAccountId = booking.trip.driver.captainPaymentAccountId || null;
    currentPaymentStatus = booking.paymentStatus;
    customerUserId = booking.goodsRequest.senderId;
    tripId = booking.tripId;
  }

  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
  if (!isAdmin && assignedDriverUserId !== auth.userId) {
    return apiError("Only the assigned Captain can confirm cash payment for this booking", 403);
  }

  const payment = await db.payment.findFirst({
    where: { bookingId, bookingType },
  });

  if (!payment) {
    return apiError("Payment record not found for this booking", 404);
  }

  if (payment.method !== "CASH") {
    return apiError("Payment method is not CASH", 400);
  }

  if (payment.status === "CAPTURED" || currentPaymentStatus === "PAID") {
    return apiSuccess({ isAlreadyCaptured: true, payment }, "Cash payment already confirmed", { status: 200 });
  }

  try {
    validatePaymentTransition(payment.status, "CAPTURED");
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid payment state transition";
    return apiError(errorMessage, 400);
  }

  const updated = await db.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        driverId: driverProfileId,
        captainPaymentAccountId,
        updatedAt: new Date(),
      },
    });

    if (bookingType === "PASSENGER") {
      await tx.passengerBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: "PAID" },
      });
    } else {
      await tx.goodsBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: "PAID" },
      });
    }

    return updatedPayment;
  });

  await logSecurityAudit("CASH_PAYMENT_CAPTURED", {
    userId: auth.userId,
    metadata: {
      bookingId,
      bookingType,
      paymentId: payment.id,
      amount: payment.amount,
    },
  });

  try {
    const { emitRealtime, bookingRoom, userRoom, tripRoom } = await import("@/lib/realtime");
    await emitRealtime({
      event: "payment:captured",
      room: bookingRoom(bookingId),
      payload: { bookingId, bookingType, paymentId: payment.id, amount: payment.amount, method: "CASH" },
    });
    if (customerUserId) {
      await emitRealtime({
        event: "payment:captured",
        room: userRoom(customerUserId),
        payload: { bookingId, bookingType, paymentId: payment.id, amount: payment.amount, method: "CASH" },
      });
    }
    if (tripId) {
      await emitRealtime({
        event: "payment:captured",
        room: tripRoom(tripId),
        payload: { bookingId, bookingType, paymentId: payment.id, amount: payment.amount, method: "CASH" },
      });
    }
  } catch {
    // Realtime best-effort
  }

  return apiSuccess({ payment: updated }, "Cash payment confirmed by Captain", { status: 200 });
}
