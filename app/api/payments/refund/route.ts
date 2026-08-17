import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { logSecurityAudit } from "@/lib/auditLog";
import { validatePaymentTransition } from "@/lib/paymentStateMachine";
import { checkRateLimit } from "@/lib/rateLimit";
import crypto from "crypto";
import { z } from "zod";

const refundSchema = z.object({
  bookingId: z.string().min(1),
  bookingType: z.enum(["PASSENGER", "GOODS"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rate = await checkRateLimit(`payment_refund_${ip}`, 5, 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many refund requests. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid refund payload", 400, parsed.error.issues);

  const { bookingId, bookingType, reason } = parsed.data;
  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";

  if (bookingType === "PASSENGER") {
    const booking = await db.passengerBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return apiError("Passenger booking not found", 404);
    if (!isAdmin && booking.passengerId !== auth.userId) return apiError("Unauthorized to request refund", 403);
  } else {
    const booking = await db.goodsBooking.findUnique({ where: { id: bookingId }, include: { goodsRequest: true } });
    if (!booking) return apiError("Goods booking not found", 404);
    if (!isAdmin && booking.goodsRequest.senderId !== auth.userId) return apiError("Unauthorized to request refund", 403);
  }

  const payment = await db.payment.findFirst({
    where: bookingType === "PASSENGER" ? { passengerBookingId: bookingId } : { goodsBookingId: bookingId },
  });

  if (!payment) return apiError("Payment record not found", 404);

  // Idempotency: If already refunded, return existing record
  if (payment.status === "REFUNDED" || payment.refundStatus === "REFUNDED") {
    return apiSuccess({ payment, isAlreadyRefunded: true }, "Payment already refunded");
  }

  if (payment.status !== "CAPTURED") {
    return apiError("Only captured payments can be refunded", 400);
  }

  validatePaymentTransition(payment.status, "REFUND_PENDING");
  validatePaymentTransition("REFUND_PENDING", "REFUNDED");

  await logSecurityAudit("REFUND_REQUESTED", {
    userId: auth.userId,
    metadata: { bookingId, bookingType, amount: payment.amount, reason },
  });

  const refundId = `rfnd_${crypto.createHash("sha256").update(`${bookingId}_${Date.now()}`).digest("hex").slice(0, 16)}`;

  const updatedPayment = await db.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundId,
        refundAmount: payment.amount,
        refundStatus: "REFUNDED",
        failureReason: reason || null,
      },
    });

    if (bookingType === "PASSENGER") {
      await tx.passengerBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: "REFUNDED", bookingStatus: "CANCELLED" },
      });
    } else {
      await tx.goodsBooking.update({
        where: { id: bookingId },
        data: { paymentStatus: "REFUNDED", deliveryStatus: "CANCELLED" },
      });
    }

    return p;
  });

  await logSecurityAudit("REFUND_SUCCESS", {
    userId: auth.userId,
    metadata: { bookingId, refundId, amount: updatedPayment.amount },
  });

  return apiSuccess({ payment: updatedPayment }, "Refund processed successfully");
}
