import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const schema = z.object({ bookingId: z.string(), deliveryProofUrl: z.string().min(2) });

export async function PATCH(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid proof", 400, parsed.error.issues);
  const booking = await db.goodsBooking.findUnique({ where: { id: parsed.data.bookingId }, include: { goodsRequest: true, trip: { include: { driver: true } } } });
  if (!booking || ![booking.goodsRequest.senderId, booking.trip.driver.userId].includes(auth.userId)) return apiError("Booking not found", 404);
  const updated = await db.goodsBooking.update({ where: { id: booking.id }, data: { deliveryProofUrl: parsed.data.deliveryProofUrl, deliveryStatus: "DELIVERED" } });
  await db.goodsRequest.update({ where: { id: booking.goodsRequestId }, data: { status: "DELIVERED" } });
  return apiSuccess({ booking: updated }, "Delivery proof saved");
}
