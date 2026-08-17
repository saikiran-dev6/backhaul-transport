import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { captainAvailabilitySchema } from "@/lib/validation";
import { emitRealtime } from "@/lib/realtime";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);

  const parsed = captainAvailabilitySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Availability must be true or false", 400, parsed.error.issues);

  const trip = await db.returnTrip.findUnique({ where: { id: params.id }, include: { driver: true } });
  if (!trip || trip.driver.userId !== auth.userId) return apiError("Trip not found", 404);

  const updated = await db.returnTrip.update({ where: { id: params.id }, data: { isLookingForPassengers: parsed.data.isLookingForPassengers } });
  const room = `route:${updated.fromLocationName}-${updated.toLocationName}`;
  const event = {
    name: "availability:update",
    room,
    payload: { type: "trip", tripId: updated.id, isLookingForPassengers: updated.isLookingForPassengers, from: updated.fromLocationName, to: updated.toLocationName },
  };
  await emitRealtime({ event: event.name, room: event.room, payload: event.payload });
  return apiSuccess({
    trip: updated,
    event,
  }, "Captain availability updated");
}
