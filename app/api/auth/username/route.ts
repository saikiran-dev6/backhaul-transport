import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("value") || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  if (username.length < 3) return apiSuccess({ available: false, suggestions: [] }, "Username too short");
  const exists = await db.user.findUnique({ where: { username } });
  if (!exists) return apiSuccess({ available: true, suggestions: [] }, "Username available");
  const candidates = [`${username}_${Math.floor(Math.random() * 90 + 10)}`, `${username}24`, `the_${username}`].slice(0, 3);
  const used = await db.user.findMany({ where: { username: { in: candidates } }, select: { username: true } });
  return apiSuccess({ available: false, suggestions: candidates.filter((item) => !used.some((u) => u.username === item)) }, "Username already taken");
}
