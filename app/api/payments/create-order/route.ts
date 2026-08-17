import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay";
import { logSecurityAudit } from "@/lib/auditLog";
import { validatePaymentTransition } from "@/lib/paymentStateMachine";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const createOrderSchema = z.object({
  bookingId: z.string().min(1),
  bookingType: z.enum(["PASSENGER", "GOODS"]),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rate = await checkRateLimit(`payment_create_${ip}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many payment creation requests. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid payment order payload", 400, parsed.error.issues);

  const { bookingId, bookingType } = parsed.data;
  let amount = 0;
  let passengerBookingId: string | null = null;
  let goodsBookingId: string | null = null;
  let driverId: string | null = null;
  let captainPaymentAccountId: string | null = null;

  if (bookingType === "PASSENGER") {
    const booking = await db.passengerBooking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { driver: true } } },
    });
    if (!booking) return apiError("Passenger booking not found", 404);
    if (booking.passengerId !== auth.userId) return apiError("Unauthorized booking access", 403);
    if (booking.bookingStatus !== "COMPLETED") {
      return apiError("Payment is not due until trip is completed", 400);
    }
    amount = booking.fare;
    passengerBookingId = booking.id;
    driverId = booking.trip.driverId;
    captainPaymentAccountId = booking.trip.driver.captainPaymentAccountId || null;
  } else {
    const booking = await db.goodsBooking.findUnique({
      where: { id: bookingId },
      include: { goodsRequest: true, trip: { include: { driver: true } } },
    });
    if (!booking) return apiError("Goods booking not found", 404);
    if (booking.goodsRequest.senderId !== auth.userId) return apiError("Unauthorized booking access", 403);
    if (booking.deliveryStatus !== "COMPLETED") {
      return apiError("Payment is not due until delivery is completed", 400);
    }
    amount = booking.price;
    goodsBookingId = booking.id;
    driverId = booking.trip.driverId;
    captainPaymentAccountId = booking.trip.driver.captainPaymentAccountId || null;
  }

  // Idempotency: Check if an existing payment order exists for this booking
  const existingPayment = await db.payment.findFirst({
    where: bookingType === "PASSENGER" ? { passengerBookingId } : { goodsBookingId },
  });

  if (existingPayment && existingPayment.providerOrderId) {
    return apiSuccess({
      orderId: existingPayment.providerOrderId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      keyId: getRazorpayConfig().keyId,
      isExisting: true,
    }, "Existing payment order retrieved");
  }

  const razorpayOrder = await createRazorpayOrder({
    amount,
    currency: "INR",
    receipt: `rcpt_${bookingId}`,
  });

  const platformFee = Math.round(amount * 0.08 * 100) / 100;
  const driverEarning = amount - platformFee;

  let paymentRecord;
  if (existingPayment) {
    validatePaymentTransition(existingPayment.status, "ORDER_CREATED");
    paymentRecord = await db.payment.update({
      where: { id: existingPayment.id },
      data: {
        providerOrderId: razorpayOrder.id,
        status: "ORDER_CREATED",
        driverId,
        captainPaymentAccountId,
        amount,
        platformFee,
        driverEarning,
      },
    });
  } else {
    paymentRecord = await db.payment.create({
      data: {
        bookingId,
        bookingType,
        passengerBookingId,
        goodsBookingId,
        driverId,
        captainPaymentAccountId,
        amount,
        platformFee,
        driverEarning,
        method: "RAZORPAY",
        status: "ORDER_CREATED",
        provider: "RAZORPAY",
        providerOrderId: razorpayOrder.id,
        currency: "INR",
      },
    });
  }

  await logSecurityAudit("PAYMENT_ORDER_CREATED", {
    userId: auth.userId,
    metadata: { bookingId, bookingType, amount, orderId: razorpayOrder.id },
  });

  try {
    const { emitRealtime, bookingRoom, userRoom } = await import("@/lib/realtime");
    await emitRealtime({
      event: "payment:order_created",
      room: bookingRoom(bookingId),
      payload: { bookingId, bookingType, orderId: razorpayOrder.id, amount },
    });
    await emitRealtime({
      event: "payment:order_created",
      room: userRoom(auth.userId),
      payload: { bookingId, bookingType, orderId: razorpayOrder.id, amount },
    });
  } catch {
    // Realtime best-effort
  }

  return apiSuccess({
    orderId: razorpayOrder.id,
    amount: paymentRecord.amount,
    currency: paymentRecord.currency,
    keyId: getRazorpayConfig().keyId,
  }, "Razorpay payment order created", { status: 201 });
}
