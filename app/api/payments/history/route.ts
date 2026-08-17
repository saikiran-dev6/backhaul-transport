import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
  const isCaptain = auth.accountRole === "CAPTAIN" || auth.role === "CAPTAIN";

  if (isAdmin) {
    const payments = await db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return apiSuccess({ payments }, "Admin payment history loaded");
  }

  if (isCaptain) {
    const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
    if (!driver) return apiError("Captain profile not found", 404);

    const payments = await db.payment.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ payments }, "Captain payment history loaded");
  }

  // Customer (Passenger / Sender)
  const passengerBookings = await db.passengerBooking.findMany({
    where: { passengerId: auth.userId },
    select: { id: true },
  });
  const goodsBookings = await db.goodsBooking.findMany({
    where: { goodsRequest: { senderId: auth.userId } },
    select: { id: true },
  });

  const pIds = passengerBookings.map((b) => b.id);
  const gIds = goodsBookings.map((b) => b.id);

  const payments = await db.payment.findMany({
    where: {
      OR: [
        { passengerBookingId: { in: pIds } },
        { goodsBookingId: { in: gIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ payments }, "Customer payment history loaded");
}
