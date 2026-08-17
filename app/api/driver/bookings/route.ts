import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const isAdmin = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
  const isCaptain = auth.accountRole === "CAPTAIN" || auth.role === "CAPTAIN";

  if (!isCaptain && !isAdmin) {
    return apiError("Backhaul Captain access required", 403);
  }

  let driverProfileId: string | null = null;
  if (!isAdmin) {
    const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
    if (!driver) return apiError("Captain profile not found", 404);
    driverProfileId = driver.id;
  }

  const trips = await db.returnTrip.findMany({
    where: driverProfileId ? { driverId: driverProfileId } : {},
    select: { id: true },
  });

  const tripIds = trips.map((t) => t.id);

  const passengerBookings = await db.passengerBooking.findMany({
    where: { tripId: { in: tripIds } },
    include: {
      passenger: { select: { id: true, fullName: true, phone: true, email: true } },
      trip: {
        include: {
          vehicle: { select: { vehicleNumber: true, vehicleType: true } },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const goodsBookings = await db.goodsBooking.findMany({
    where: { tripId: { in: tripIds } },
    include: {
      goodsRequest: {
        include: {
          sender: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      },
      trip: {
        include: {
          vehicle: { select: { vehicleNumber: true, vehicleType: true } },
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ passengerBookings, goodsBookings }, "Captain assigned bookings retrieved");
}
