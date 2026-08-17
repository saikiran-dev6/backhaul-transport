import { NextRequest } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { emitRealtime, routeRoom } from "@/lib/realtime";
import { setDriverLocationPoint } from "@/lib/postgis";

const schema = z.object({
  tripId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: z.enum(["IDLE", "LOOKING", "DRIVING", "OFFLINE"]).default("DRIVING"),
});

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid driver location", 400, parsed.error.issues);

  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return apiError("Driver profile missing", 404);

  const trip = parsed.data.tripId ? await db.returnTrip.findFirst({ where: { id: parsed.data.tripId, driverId: driver.id } }) : null;
  if (parsed.data.tripId && !trip) return apiError("Trip not found", 404);

  const location = await db.driverLocation.create({
    data: { driverId: driver.id, tripId: trip?.id, lat: parsed.data.lat, lng: parsed.data.lng, status: parsed.data.status },
  });
  await setDriverLocationPoint(db, location.id, location.lng, location.lat);
  const event = {
    event: "driver:gps",
    room: trip ? routeRoom(trip.fromLocationName, trip.toLocationName) : `driver:${driver.id}`,
    payload: { driverId: driver.id, tripId: trip?.id, lat: location.lat, lng: location.lng, status: location.status, createdAt: location.createdAt },
  };
  await emitRealtime(event);
  return apiSuccess({ location, event }, "Driver location updated", { status: 201 });
}
