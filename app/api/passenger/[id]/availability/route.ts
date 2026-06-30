import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ isLookingForRide: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ROUTEMATE") return NextResponse.json({ error: "RouteMate access required" }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Availability must be true or false" }, { status: 400 });

  const booking = await db.passengerBooking.findUnique({ where: { id: params.id } });
  if (!booking || booking.passengerId !== auth.userId) return NextResponse.json({ error: "Passenger request not found" }, { status: 404 });

  const updated = await db.passengerBooking.update({ where: { id: params.id }, data: { isLookingForRide: parsed.data.isLookingForRide } });
  const room = `route:${updated.pickupName}-${updated.dropName}`;
  return NextResponse.json({
    booking: updated,
    event: {
      name: "availability:update",
      room,
      payload: { type: "passenger", passengerBookingId: updated.id, isLookingForRide: updated.isLookingForRide, from: updated.pickupName, to: updated.dropName },
    },
  });
}
