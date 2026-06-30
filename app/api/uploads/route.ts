import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { requestUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file || file.size > 5_000_000 || !file.type.startsWith("image/")) return NextResponse.json({ error: "Choose an image up to 5 MB" }, { status: 400 });
  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 8) || ".jpg";
  const fileName = `${auth.userId}-goods-${Date.now()}${extension}`;
  await writeFile(path.join(process.cwd(), "public", "uploads", fileName), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
}
