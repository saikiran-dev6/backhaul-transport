import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return NextResponse.json({ error: "Captain access required" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const documentType = String(form.get("documentType") || "");
  const vehicleId = String(form.get("vehicleId") || "") || null;
  if (!file || !documentType || file.size > 5_000_000) return NextResponse.json({ error: "Choose a document up to 5 MB" }, { status: 400 });
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return NextResponse.json({ error: "Driver profile missing" }, { status: 404 });
  if (vehicleId && !(await db.vehicle.findFirst({ where: { id: vehicleId, driverId: driver.id } }))) return NextResponse.json({ error: "Invalid vehicle" }, { status: 403 });
  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 8) || ".bin";
  const fileName = `${driver.id}-${documentType.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}${extension}`;
  await writeFile(path.join(process.cwd(), "public", "uploads", fileName), Buffer.from(await file.arrayBuffer()));
  const document = await db.driverDocument.create({ data: { driverId: driver.id, vehicleId, documentType, fileUrl: `/uploads/${fileName}` } });
  return NextResponse.json({ document }, { status: 201 });
}
