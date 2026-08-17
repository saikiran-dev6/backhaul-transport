import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { passengerAvailabilitySchema } from "@/lib/validation";
import { emitRealtime } from "@/lib/realtime";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ROUTEMATE") return apiError("RouteMate access required", 403);

  const parsed = passengerAvailabilitySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Availability must be true or false", 400, parsed.error.issues);

  const booking = await db.passengerBooking.findUnique({ where: { id: params.id } });
  if (!booking || booking.passengerId !== auth.userId) return apiError("Passenger request not found", 404);

  const updated = await db.passengerBooking.update({ where: { id: params.id }, data: { isLookingForRide: parsed.data.isLookingForRide } });
  const room = `route:${updated.pickupName}-${updated.dropName}`;
  const event = {
    name: "availability:update",
    room,
    payload: { type: "passenger", passengerBookingId: updated.id, isLookingForRide: updated.isLookingForRide, from: updated.pickupName, to: updated.dropName },
  };
  await emitRealtime({ event: event.name, room: event.room, payload: event.payload });
  return apiSuccess({
    booking: updated,
    event,
  }, "Passenger availability updated");
}
