import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ toUserId: z.string(), tripId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().max(500).optional() });

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Rating must be 1 to 5" }, { status: 400 });
  const rating = await db.rating.create({ data: { fromUserId: auth.userId, ...parsed.data } });
  const target = await db.driverProfile.findUnique({ where: { userId: parsed.data.toUserId } });
  if (target) {
    const average = await db.rating.aggregate({ where: { toUserId: parsed.data.toUserId }, _avg: { rating: true } });
    await db.driverProfile.update({ where: { id: target.id }, data: { rating: average._avg.rating || target.rating } });
  }
  return NextResponse.json({ rating }, { status: 201 });
}
