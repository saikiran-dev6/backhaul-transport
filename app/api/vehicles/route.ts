import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const schema = z.object({ vehicleNumber: z.string().min(6).max(15), vehicleType: z.string().min(2), permitType: z.enum(["PASSENGER", "GOODS", "BOTH"]), passengerCapacity: z.number().int().min(0).max(50), goodsCapacityKg: z.number().min(0), fuelType: z.string(), mileageKmPerLiter: z.number().positive() });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Captain access required", 403);
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  return apiSuccess({ vehicles: driver ? await db.vehicle.findMany({ where: { driverId: driver.id } }) : [] }, "Vehicles loaded");
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Captain access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid vehicle", 400, parsed.error.issues);
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return apiError("Driver profile missing", 404);
  const vehicle = await db.vehicle.create({ data: { ...parsed.data, vehicleNumber: parsed.data.vehicleNumber.replace(/\s/g, "").toUpperCase(), driverId: driver.id } }).catch(() => null);
  if (!vehicle) return apiError("Vehicle number is already registered", 409);
  return apiSuccess({ vehicle }, "Vehicle added", { status: 201 });
}
