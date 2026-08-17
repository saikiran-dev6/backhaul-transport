import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { logSecurityAudit } from "@/lib/auditLog";
import { canTransitionPayment } from "@/lib/paymentStateMachine";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return apiError("Missing Razorpay webhook signature header", 401);
  }

  const rawBody = await request.text();
  const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signature);

  if (!isValidSignature) {
    await logSecurityAudit("PAYMENT_SIGNATURE_INVALID", {
      metadata: { webhook: true },
    });
    return apiError("Invalid webhook signature", 401);
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return apiError("Invalid JSON webhook payload", 400);
  }

  const eventId = eventPayload.id || `evt_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`;
  const eventType = eventPayload.event || "unknown";

  // Replay Protection: Check if eventId was already processed
  const existingWebhook = await db.paymentWebhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: "RAZORPAY",
        eventId,
      },
    },
  });

  if (existingWebhook) {
    await logSecurityAudit("PAYMENT_WEBHOOK_REPLAY", {
      metadata: { eventId, eventType },
    });
    return apiSuccess({ eventId, isDuplicate: true }, "Webhook event already processed");
  }

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

  try {
    const paymentEntity = eventPayload.payload?.payment?.entity || eventPayload.payload?.refund?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (eventType === "payment.captured" || eventType === "payment.authorized") {
      if (orderId || paymentId) {
        const payment = await db.payment.findFirst({
          where: {
            OR: [
              { providerOrderId: orderId || undefined },
              { providerPaymentId: paymentId || undefined },
            ],
          },
        });

        if (payment && canTransitionPayment(payment.status, "CAPTURED")) {
          await db.$transaction([
            db.payment.update({
              where: { id: payment.id },
              data: {
                status: "CAPTURED",
                providerPaymentId: paymentId || payment.providerPaymentId,
              },
            }),
            ...(payment.passengerBookingId
              ? [db.passengerBooking.update({ where: { id: payment.passengerBookingId }, data: { paymentStatus: "PAID" } })]
              : []),
            ...(payment.goodsBookingId
              ? [db.goodsBooking.update({ where: { id: payment.goodsBookingId }, data: { paymentStatus: "PAID" } })]
              : []),
          ]);
        }
      }
    } else if (eventType === "payment.failed") {
      if (orderId || paymentId) {
        const payment = await db.payment.findFirst({
          where: {
            OR: [
              { providerOrderId: orderId || undefined },
              { providerPaymentId: paymentId || undefined },
            ],
          },
        });

        if (payment && canTransitionPayment(payment.status, "FAILED")) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", failureReason: paymentEntity?.error_description || "Webhook payment failed" },
          });
        }
      }
    }

    await db.paymentWebhookEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId,
        eventType,
        payloadHash,
        status: "PROCESSED",
      },
    });

    await logSecurityAudit("PAYMENT_WEBHOOK_RECEIVED", {
      metadata: { eventId, eventType, orderId, paymentId },
    });

    return apiSuccess({ eventId, eventType }, "Webhook processed successfully");
  } catch (error: any) {
    await db.paymentWebhookEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId,
        eventType,
        payloadHash,
        status: "FAILED",
        error: error?.message || "Processing error",
      },
    });
    return apiError("Webhook processing error", 500);
  }
}
