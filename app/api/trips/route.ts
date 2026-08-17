import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { routeDistanceEstimateKm } from "@/lib/geo";
import { tripPostSchema } from "@/lib/validation";
import { setTripGeo } from "@/lib/postgis";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Please login to access Backhaul services.", 401);
  const own = request.nextUrl.searchParams.get("own") === "1";
  if (own && auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);
  let driverId: string | undefined;
  if (own && auth?.role === "CAPTAIN") driverId = (await db.driverProfile.findUnique({ where: { userId: auth.userId } }))?.id;
  const trips = await db.returnTrip.findMany({ where: { ...(driverId ? { driverId } : {}), ...(own ? {} : { status: "ACTIVE" }) }, include: { vehicle: true, driver: { include: { user: { select: { fullName: true } } } }, _count: { select: { passengerBookings: true, goodsBookings: true } } }, orderBy: { departureTime: "asc" }, take: 50 });
  return apiSuccess({ trips }, "Trips loaded");
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Please login to access Backhaul services.", 401);
  if (auth.role !== "CAPTAIN") return apiError("Backhaul Captain access required", 403);
  const parsed = tripPostSchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid trip", 400, parsed.error.issues);
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver || driver.verificationStatus !== "APPROVED") return apiError("Control Hub approval is required before posting public trips", 403);
  const vehicle = await db.vehicle.findFirst({ where: { id: parsed.data.vehicleId, driverId: driver.id } });
  if (!vehicle || vehicle.verificationStatus !== "APPROVED") return apiError("Choose an approved vehicle", 403);
  if (parsed.data.availableSeats > vehicle.passengerCapacity) return apiError("Seats exceed vehicle capacity", 400);
  if (parsed.data.availableGoodsCapacityKg > vehicle.goodsCapacityKg) return apiError("Goods weight exceeds vehicle capacity", 400);
  const distance = routeDistanceEstimateKm(parsed.data.from, parsed.data.to);
  const trip = await db.returnTrip.create({ data: { driverId: driver.id, vehicleId: vehicle.id, fromLocationName: parsed.data.from.name, fromLat: parsed.data.from.lat, fromLng: parsed.data.from.lng, toLocationName: parsed.data.to.name, toLat: parsed.data.to.lat, toLng: parsed.data.to.lng, routeDistanceKm: distance, estimatedDurationMin: Math.round((distance / 52) * 60), routePolyline: JSON.stringify([[parsed.data.from.lat, parsed.data.from.lng], [parsed.data.to.lat, parsed.data.to.lng]]), departureTime: new Date(parsed.data.departureTime), availableSeats: parsed.data.availableSeats, availableGoodsCapacityKg: parsed.data.availableGoodsCapacityKg, maxDetourKm: parsed.data.maxDetourKm, allowedPickupPoints: JSON.stringify(parsed.data.allowedPickupPoints), allowedDropPoints: JSON.stringify(parsed.data.allowedDropPoints), allowedGoodsTypes: JSON.stringify(parsed.data.allowedGoodsTypes), isLookingForPassengers: parsed.data.availableSeats > 0, isLookingForGoods: parsed.data.availableGoodsCapacityKg > 0, status: "ACTIVE" } });
  await setTripGeo(db, trip.id, parsed.data.from.lng, parsed.data.from.lat, parsed.data.to.lng, parsed.data.to.lat);
  return apiSuccess({ trip }, "Trip posted", { status: 201 });
}
