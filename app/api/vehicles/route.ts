import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ vehicleNumber: z.string().min(6).max(15), vehicleType: z.string().min(2), permitType: z.enum(["PASSENGER", "GOODS", "BOTH"]), passengerCapacity: z.number().int().min(0).max(50), goodsCapacityKg: z.number().min(0), fuelType: z.string(), mileageKmPerLiter: z.number().positive() });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return NextResponse.json({ error: "Captain access required" }, { status: 403 });
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  return NextResponse.json({ vehicles: driver ? await db.vehicle.findMany({ where: { driverId: driver.id } }) : [] });
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return NextResponse.json({ error: "Captain access required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid vehicle" }, { status: 400 });
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return NextResponse.json({ error: "Driver profile missing" }, { status: 404 });
  const vehicle = await db.vehicle.create({ data: { ...parsed.data, vehicleNumber: parsed.data.vehicleNumber.replace(/\s/g, "").toUpperCase(), driverId: driver.id } }).catch(() => null);
  if (!vehicle) return NextResponse.json({ error: "Vehicle number is already registered" }, { status: 409 });
  return NextResponse.json({ vehicle }, { status: 201 });
}
