import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ target: z.enum(["DRIVER", "VEHICLE", "DOCUMENT"]), id: z.string(), status: z.enum(["APPROVED", "REJECTED"]), rejectionReason: z.string().optional() });

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Control Hub access required" }, { status: 403 });
  const [drivers, vehicles, documents] = await Promise.all([
    db.driverProfile.findMany({ include: { user: { select: { fullName: true, email: true, phone: true } }, documents: true, vehicles: true }, orderBy: { verificationStatus: "asc" } }),
    db.vehicle.findMany({ include: { driver: { include: { user: { select: { fullName: true } } } } }, orderBy: { verificationStatus: "asc" } }),
    db.driverDocument.findMany({ include: { driver: { include: { user: { select: { fullName: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ drivers, vehicles, documents });
}

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "ADMIN") return NextResponse.json({ error: "Control Hub access required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid verification action" }, { status: 400 });
  const { target, id, status, rejectionReason } = parsed.data;
  if (target === "DRIVER") await db.driverProfile.update({ where: { id }, data: { verificationStatus: status } });
  if (target === "VEHICLE") await db.vehicle.update({ where: { id }, data: { verificationStatus: status } });
  if (target === "DOCUMENT") await db.driverDocument.update({ where: { id }, data: { status, rejectionReason: status === "REJECTED" ? rejectionReason || "Document needs correction" : null } });
  return NextResponse.json({ message: `${target.toLowerCase()} ${status.toLowerCase()}` });
}
