import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { storeUpload } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") || "goods");
  const allowedKind = kind === "proof" ? "proof" : kind === "profile" ? "profile" : "goods";
  if (!file) return apiError("Choose an image up to 5 MB", 400);
  try {
    const upload = await storeUpload(file, { ownerId: auth.userId, kind: allowedKind, maxBytes: 5_000_000, allowedTypes: /^image\// });
    return apiSuccess({ url: upload.url, upload }, "File uploaded", { status: 201 });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Upload failed", 400);
  }
}
