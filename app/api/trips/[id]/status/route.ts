import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { emitRealtime, routeRoom } from "@/lib/realtime";

const schema = z.object({ status: z.enum(["ACTIVE", "DRIVING", "PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Choose a valid trip status", 400, parsed.error.issues);

  const trip = await db.returnTrip.findUnique({ where: { id: params.id }, include: { driver: true } });
  if (!trip || trip.driver.userId !== auth.userId) return apiError("Trip not found", 404);

  try {
    const { validateTripTransition } = await import("@/lib/bookingStateMachine");
    validateTripTransition(trip.status, parsed.data.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Illegal status transition";
    return apiError(msg, 400);
  }

  const updated = await db.returnTrip.update({ where: { id: trip.id }, data: { status: parsed.data.status } });
  const event = {
    event: "trip:status",
    room: routeRoom(updated.fromLocationName, updated.toLocationName),
    payload: { tripId: updated.id, status: updated.status, from: updated.fromLocationName, to: updated.toLocationName },
  };
  await db.tripEvent.create({ data: { tripId: updated.id, actorId: auth.userId, type: "STATUS_CHANGE", status: updated.status } });
  await emitRealtime(event);
  return apiSuccess({ trip: updated, event }, "Trip status updated");
}
