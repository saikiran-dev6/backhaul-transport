import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
  if (!isAdmin) return apiError("Admin access required", 403);

  const [
    completedUnpaidPassenger,
    completedUnpaidGoods,
    paymentStatusCounts,
    pendingRefunds,
    refundedPayments,
  ] = await Promise.all([
    db.passengerBooking.findMany({
      where: { bookingStatus: "COMPLETED", paymentStatus: "UNPAID" },
      select: { id: true, fare: true, passengerId: true, createdAt: true },
    }),
    db.goodsBooking.findMany({
      where: { deliveryStatus: "COMPLETED", paymentStatus: "UNPAID" },
      select: { id: true, price: true, goodsRequest: { select: { senderId: true } }, createdAt: true },
    }),
    db.payment.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amount: true },
    }),
    db.payment.findMany({
      where: { status: "REFUND_PENDING" },
      select: { id: true, amount: true, bookingId: true, bookingType: true, createdAt: true },
    }),
    db.payment.findMany({
      where: { status: "REFUNDED" },
      select: { id: true, amount: true, bookingId: true, bookingType: true, updatedAt: true },
    }),
  ]);

  const summary = {
    completedUnpaidCount: completedUnpaidPassenger.length + completedUnpaidGoods.length,
    completedUnpaidPassengerCount: completedUnpaidPassenger.length,
    completedUnpaidGoodsCount: completedUnpaidGoods.length,
    byStatus: paymentStatusCounts.reduce((acc, curr) => {
      acc[curr.status] = { count: curr._count.id, totalAmount: curr._sum.amount || 0 };
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>),
    pendingRefunds,
    refundedPayments,
  };

  return apiSuccess({ summary, completedUnpaidPassenger, completedUnpaidGoods }, "Admin payment reconciliation data loaded");
}
