import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { routeDistanceEstimateKm } from "@/lib/geo";
import { locationSchema } from "@/lib/validation";
import { z } from "zod";

const tripSchema = z.object({
  vehicleId: z.string().min(1), from: locationSchema, to: locationSchema, departureTime: z.string().datetime(),
  availableSeats: z.number().int().min(0), availableGoodsCapacityKg: z.number().min(0), maxDetourKm: z.number().min(0).max(100),
  allowedPickupPoints: z.array(z.string()).default([]), allowedDropPoints: z.array(z.string()).default([]), allowedGoodsTypes: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Please login to access Backhaul services." }, { status: 401 });
  const own = request.nextUrl.searchParams.get("own") === "1";
  if (own && auth.role !== "CAPTAIN") return NextResponse.json({ error: "Backhaul Captain access required" }, { status: 403 });
  let driverId: string | undefined;
  if (own && auth?.role === "CAPTAIN") driverId = (await db.driverProfile.findUnique({ where: { userId: auth.userId } }))?.id;
  const trips = await db.returnTrip.findMany({ where: { ...(driverId ? { driverId } : {}), ...(own ? {} : { status: "ACTIVE" }) }, include: { vehicle: true, driver: { include: { user: { select: { fullName: true } } } }, _count: { select: { passengerBookings: true, goodsBookings: true } } }, orderBy: { departureTime: "asc" }, take: 50 });
  return NextResponse.json({ trips });
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return NextResponse.json({ error: "Backhaul Captain access required" }, { status: 403 });
  const parsed = tripSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid trip" }, { status: 400 });
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver || driver.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Control Hub approval is required before posting public trips" }, { status: 403 });
  const vehicle = await db.vehicle.findFirst({ where: { id: parsed.data.vehicleId, driverId: driver.id } });
  if (!vehicle || vehicle.verificationStatus !== "APPROVED") return NextResponse.json({ error: "Choose an approved vehicle" }, { status: 403 });
  if (parsed.data.availableSeats > vehicle.passengerCapacity) return NextResponse.json({ error: "Seats exceed vehicle capacity" }, { status: 400 });
  if (parsed.data.availableGoodsCapacityKg > vehicle.goodsCapacityKg) return NextResponse.json({ error: "Goods weight exceeds vehicle capacity" }, { status: 400 });
  const distance = routeDistanceEstimateKm(parsed.data.from, parsed.data.to);
  const trip = await db.returnTrip.create({ data: { driverId: driver.id, vehicleId: vehicle.id, fromLocationName: parsed.data.from.name, fromLat: parsed.data.from.lat, fromLng: parsed.data.from.lng, toLocationName: parsed.data.to.name, toLat: parsed.data.to.lat, toLng: parsed.data.to.lng, routeDistanceKm: distance, estimatedDurationMin: Math.round((distance / 52) * 60), routePolyline: JSON.stringify([[parsed.data.from.lat, parsed.data.from.lng], [parsed.data.to.lat, parsed.data.to.lng]]), departureTime: new Date(parsed.data.departureTime), availableSeats: parsed.data.availableSeats, availableGoodsCapacityKg: parsed.data.availableGoodsCapacityKg, maxDetourKm: parsed.data.maxDetourKm, allowedPickupPoints: JSON.stringify(parsed.data.allowedPickupPoints), allowedDropPoints: JSON.stringify(parsed.data.allowedDropPoints), allowedGoodsTypes: JSON.stringify(parsed.data.allowedGoodsTypes), status: "ACTIVE" } });
  return NextResponse.json({ trip }, { status: 201 });
}
