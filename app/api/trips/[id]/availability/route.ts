import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ isLookingForPassengers: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return NextResponse.json({ error: "Backhaul Captain access required" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Availability must be true or false" }, { status: 400 });

  const trip = await db.returnTrip.findUnique({ where: { id: params.id }, include: { driver: true } });
  if (!trip || trip.driver.userId !== auth.userId) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const updated = await db.returnTrip.update({ where: { id: params.id }, data: { isLookingForPassengers: parsed.data.isLookingForPassengers } });
  const room = `route:${updated.fromLocationName}-${updated.toLocationName}`;
  return NextResponse.json({
    trip: updated,
    event: {
      name: "availability:update",
      room,
      payload: { type: "trip", tripId: updated.id, isLookingForPassengers: updated.isLookingForPassengers, from: updated.fromLocationName, to: updated.toLocationName },
    },
  });
}
