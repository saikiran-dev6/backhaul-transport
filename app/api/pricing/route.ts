import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const schema = z.object({ id: z.string(), fuelPrice: z.number().positive(), baseFarePerKm: z.number().positive(), platformFeePercent: z.number().min(0).max(30), minimumFare: z.number().positive(), seatDiscountPercent: z.number().min(0).max(50), goodsWeightRate: z.number().min(0), driverBaseEarning: z.number().min(0), detourRatePerKm: z.number().min(0) });

export const dynamic = "force-dynamic";

export async function GET() {
  return apiSuccess({ rules: await db.pricingRule.findMany({ orderBy: { vehicleType: "asc" } }) }, "Pricing rules loaded");
}

export async function PUT(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ADMIN") return apiError("Control Hub access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid pricing rule", 400, parsed.error.issues);
  const { id, ...data } = parsed.data;
  return apiSuccess({ rule: await db.pricingRule.update({ where: { id }, data }) }, "Pricing rule updated");
}
