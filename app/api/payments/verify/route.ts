import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { logSecurityAudit } from "@/lib/auditLog";
import { validatePaymentTransition } from "@/lib/paymentStateMachine";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const verifyPaymentSchema = z.object({
  bookingId: z.string().min(1),
  bookingType: z.enum(["PASSENGER", "GOODS"]),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rate = await checkRateLimit(`payment_verify_${ip}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many payment verification attempts. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json();
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid payment verification payload", 400, parsed.error.issues);

  const { bookingId, bookingType, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  if (bookingType === "PASSENGER") {
    const booking = await db.passengerBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return apiError("Passenger booking not found", 404);
    if (booking.passengerId !== auth.userId) return apiError("Unauthorized booking access", 403);
    if (booking.bookingStatus !== "COMPLETED") {
      return apiError("Payment is not due until trip is completed", 400);
    }
  } else {
    const booking = await db.goodsBooking.findUnique({ where: { id: bookingId }, include: { goodsRequest: true } });
    if (!booking) return apiError("Goods booking not found", 404);
    if (booking.goodsRequest.senderId !== auth.userId) return apiError("Unauthorized booking access", 403);
    if (booking.deliveryStatus !== "COMPLETED") {
      return apiError("Payment is not due until delivery is completed", 400);
    }
  }

  const payment = await db.payment.findFirst({
    where: bookingType === "PASSENGER" ? { passengerBookingId: bookingId } : { goodsBookingId: bookingId },
  });

  if (!payment) return apiError("Payment record not found for booking", 404);

  // If already captured, return existing success (idempotent)
  if (payment.status === "CAPTURED" && payment.providerPaymentId === razorpayPaymentId) {
    return apiSuccess({ payment, isAlreadyVerified: true }, "Payment already verified and captured");
  }

  // Cryptographic Signature Verification
  const isValidSignature = verifyRazorpayPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValidSignature) {
    await logSecurityAudit("PAYMENT_SIGNATURE_INVALID", {
      userId: auth.userId,
      metadata: { bookingId, razorpayOrderId, razorpayPaymentId },
    });
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Signature verification failed" },
    });
    return apiError("Payment signature verification failed", 400);
  }

  validatePaymentTransition(payment.status, "CAPTURED");

  const updatedPayment = await db.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        providerOrderId: razorpayOrderId,
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
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

    return p;
  });

  await logSecurityAudit("PAYMENT_VERIFICATION_SUCCESS", {
    userId: auth.userId,
    metadata: { bookingId, bookingType, amount: updatedPayment.amount, razorpayPaymentId },
  });

  await logSecurityAudit("PAYMENT_CAPTURED", {
    userId: auth.userId,
    metadata: { bookingId, amount: updatedPayment.amount },
  });

  return apiSuccess({ payment: updatedPayment }, "Payment verified and captured successfully");
}
