import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/apiResponse";

const schema = z.object({ target: z.enum(["DRIVER", "VEHICLE", "DOCUMENT"]), id: z.string(), status: z.enum(["APPROVED", "REJECTED"]), rejectionReason: z.string().optional() });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || (auth.accountRole !== "ADMIN" && auth.role !== "ADMIN")) return apiError("Control Hub access required", 403);
  const [drivers, vehicles, documents] = await Promise.all([
    db.driverProfile.findMany({ include: { user: { select: { fullName: true, email: true, phone: true } }, documents: true, vehicles: true }, orderBy: { verificationStatus: "asc" } }),
    db.vehicle.findMany({ include: { driver: { include: { user: { select: { fullName: true } } } } }, orderBy: { verificationStatus: "asc" } }),
    db.driverDocument.findMany({ include: { driver: { include: { user: { select: { fullName: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return apiSuccess({ drivers, vehicles, documents }, "Verification queue loaded");
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || (auth.accountRole !== "ADMIN" && auth.role !== "ADMIN")) return apiError("Control Hub access required", 403);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid verification action", 400, parsed.error.issues);
  const { target, id, status, rejectionReason } = parsed.data;
  if (target === "DRIVER") await db.driverProfile.update({ where: { id }, data: { verificationStatus: status } });
  if (target === "VEHICLE") await db.vehicle.update({ where: { id }, data: { verificationStatus: status } });
  if (target === "DOCUMENT") await db.driverDocument.update({ where: { id }, data: { status, rejectionReason: status === "REJECTED" ? rejectionReason || "Document needs correction" : null } });
  return apiSuccess({ target, status }, `${target.toLowerCase()} ${status.toLowerCase()}`);
}
