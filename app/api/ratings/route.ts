import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/apiResponse";

const schema = z.object({ toUserId: z.string(), tripId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().max(500).optional() });

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Rating must be 1 to 5", 400, parsed.error.issues);
  const rating = await db.rating.create({ data: { fromUserId: auth.userId, ...parsed.data } });
  const target = await db.driverProfile.findUnique({ where: { userId: parsed.data.toUserId } });
  if (target) {
    const average = await db.rating.aggregate({ where: { toUserId: parsed.data.toUserId }, _avg: { rating: true } });
    await db.driverProfile.update({ where: { id: target.id }, data: { rating: average._avg.rating || target.rating } });
  }
  return apiSuccess({ rating }, "Rating submitted", { status: 201 });
}
