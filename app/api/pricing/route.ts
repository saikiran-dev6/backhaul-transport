import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ id: z.string(), fuelPrice: z.number().positive(), baseFarePerKm: z.number().positive(), platformFeePercent: z.number().min(0).max(30), minimumFare: z.number().positive(), seatDiscountPercent: z.number().min(0).max(50), goodsWeightRate: z.number().min(0), driverBaseEarning: z.number().min(0), detourRatePerKm: z.number().min(0) });

export async function GET() {
  return NextResponse.json({ rules: await db.pricingRule.findMany({ orderBy: { vehicleType: "asc" } }) });
}

export async function PUT(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Control Hub access required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid pricing rule" }, { status: 400 });
  const { id, ...data } = parsed.data;
  return NextResponse.json({ rule: await db.pricingRule.update({ where: { id }, data }) });
}
