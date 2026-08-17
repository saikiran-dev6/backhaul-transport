import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const schema = z.object({ licenseNumber: z.string().min(5), emergencyContact: z.string().regex(/^[6-9]\d{9}$/), bankUpiDetails: z.string().min(3) });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Captain access required", 403);
  const profile = await db.driverProfile.findUnique({ where: { userId: auth.userId }, include: { vehicles: true, documents: true } });
  return apiSuccess({ profile }, "Driver profile loaded");
}

export async function PATCH(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Captain access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid details", 400, parsed.error.issues);
  const profile = await db.driverProfile.update({ where: { userId: auth.userId }, data: parsed.data });
  return apiSuccess({ profile }, "Driver profile updated");
}
