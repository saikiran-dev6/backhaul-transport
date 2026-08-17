import { mkdir, writeFile } from "fs/promises";
import path from "path";

type UploadKind = "goods" | "document" | "proof" | "profile";

export type StoredUpload = {
  url: string;
  key: string;
  driver: "local" | "s3" | "supabase";
};

function safeExtension(name: string, fallback = ".bin") {
  return path.extname(name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 12) || fallback;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "upload";
}

export async function storeUpload(file: File, options: { ownerId: string; kind: UploadKind; label?: string; maxBytes?: number; allowedTypes?: RegExp }) {
  const maxBytes = options.maxBytes ?? 5_000_000;
  if (file.size <= 0 || file.size > maxBytes) throw new Error(`Choose a file up to ${Math.round(maxBytes / 1_000_000)} MB`);
  if (options.allowedTypes && !options.allowedTypes.test(file.type)) throw new Error("Unsupported file type");

  const driver = (process.env.UPLOAD_DRIVER || "local").toLowerCase();
  const extension = safeExtension(file.name, options.kind === "goods" || options.kind === "profile" ? ".jpg" : ".bin");
  const key = `${options.kind}/${slug(options.ownerId)}/${slug(options.label || file.name)}-${Date.now()}${extension}`;

  if (driver === "s3" || driver === "supabase") {
    const publicBase = process.env.PUBLIC_UPLOAD_BASE_URL;
    if (!publicBase) throw new Error(`${driver.toUpperCase()} storage needs PUBLIC_UPLOAD_BASE_URL`);
    return { key, url: `${publicBase.replace(/\/$/, "")}/${key}`, driver } satisfies StoredUpload;
  }

  const uploadRoot = process.env.UPLOAD_DIR || path.join("public", "uploads");
  const absoluteRoot = path.isAbsolute(uploadRoot) ? uploadRoot : path.join(process.cwd(), uploadRoot);
  const absolutePath = path.join(absoluteRoot, key);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return { key, url: `/uploads/${key.replace(/\\/g, "/")}`, driver: "local" } satisfies StoredUpload;
}
