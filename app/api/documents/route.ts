import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { storeUpload } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth || auth.role !== "CAPTAIN") return apiError("Captain access required", 403);
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const documentType = String(form.get("documentType") || "");
  const vehicleId = String(form.get("vehicleId") || "") || null;
  if (!file || !documentType) return apiError("Choose a document up to 5 MB", 400);
  const driver = await db.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return apiError("Driver profile missing", 404);
  if (vehicleId && !(await db.vehicle.findFirst({ where: { id: vehicleId, driverId: driver.id } }))) return apiError("Invalid vehicle", 403);
  try {
    const upload = await storeUpload(file, { ownerId: driver.id, kind: "document", label: documentType, maxBytes: 5_000_000, allowedTypes: /^(image\/|application\/pdf)/ });
    const document = await db.driverDocument.create({ data: { driverId: driver.id, vehicleId, documentType, fileUrl: upload.url } });
    return apiSuccess({ document, upload }, "Document uploaded", { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Upload failed", 400);
  }
}
