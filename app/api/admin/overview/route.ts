import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || (auth.accountRole !== "ADMIN" && auth.role !== "ADMIN")) return apiError("Control Hub access required", 403);
  const [users, trips, passengerBookings, goodsBookings, complaints] = await Promise.all([
    db.user.findMany({ select: { id: true, fullName: true, username: true, email: true, phone: true, role: true, otpVerified: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.returnTrip.findMany({ include: { vehicle: true, driver: { include: { user: { select: { fullName: true } } } }, _count: { select: { passengerBookings: true, goodsBookings: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.passengerBooking.findMany({ include: { passenger: { select: { fullName: true } }, trip: { select: { fromLocationName: true, toLocationName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.goodsBooking.findMany({ include: { goodsRequest: { include: { sender: { select: { fullName: true } } } }, trip: { select: { fromLocationName: true, toLocationName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.complaint.findMany({ include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return apiSuccess({ users, trips, passengerBookings, goodsBookings, complaints }, "Control Hub overview loaded");
}
