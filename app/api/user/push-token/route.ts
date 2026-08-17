import { NextResponse } from "next/server";
import { z } from "zod";
import { requestUser } from "@/lib/auth";
import { trackMetric } from "@/lib/monitoring";

const pushTokenSchema = z.object({
  pushToken: z.string().min(5, "Push token must be at least 5 characters"),
});

export async function POST(request: Request) {
  const auth = await requestUser(request as any);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = pushTokenSchema.parse(body);

    trackMetric("push_token_registered", 1);

    return NextResponse.json({
      success: true,
      message: "Push token registered successfully",
      userId: auth.userId,
      pushToken: parsed.pushToken,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}
