import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("value") || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  if (username.length < 3) return NextResponse.json({ available: false, suggestions: [] });
  const exists = await db.user.findUnique({ where: { username } });
  if (!exists) return NextResponse.json({ available: true, suggestions: [] });
  const candidates = [`${username}_${Math.floor(Math.random() * 90 + 10)}`, `${username}24`, `the_${username}`].slice(0, 3);
  const used = await db.user.findMany({ where: { username: { in: candidates } }, select: { username: true } });
  return NextResponse.json({ available: false, suggestions: candidates.filter((item) => !used.some((u) => u.username === item)) });
}
