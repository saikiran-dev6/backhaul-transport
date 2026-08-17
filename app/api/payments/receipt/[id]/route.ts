import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const payment = await db.payment.findUnique({
    where: { id: params.id },
    include: {
      driver: { include: { user: { select: { fullName: true } } } },
    },
  });

  if (!payment) return apiError("Payment receipt not found", 404);

  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
  let isAuthorized = isAdmin;

  if (!isAuthorized && payment.passengerBookingId) {
    const booking = await db.passengerBooking.findUnique({
      where: { id: payment.passengerBookingId },
      include: { trip: { include: { driver: true } } },
    });
    if (booking && (booking.passengerId === auth.userId || booking.trip.driver.userId === auth.userId)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized && payment.goodsBookingId) {
    const booking = await db.goodsBooking.findUnique({
      where: { id: payment.goodsBookingId },
      include: { goodsRequest: true, trip: { include: { driver: true } } },
    });
    if (booking && (booking.goodsRequest.senderId === auth.userId || booking.trip.driver.userId === auth.userId)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return apiError("Unauthorized receipt access", 403);
  }

  // Return safe non-sensitive receipt data
  const receipt = {
    receiptId: `RCPT-${payment.id.slice(-8).toUpperCase()}`,
    paymentId: payment.id,
    bookingId: payment.bookingId,
    bookingType: payment.bookingType,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId || null,
    captainName: payment.driver?.user?.fullName || "Assigned Captain",
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };

  return apiSuccess({ receipt }, "Payment receipt loaded");
}
