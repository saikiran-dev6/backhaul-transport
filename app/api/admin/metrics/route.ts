import { NextResponse } from "next/server";
import { readToken } from "@/lib/auth";
import { getMetricsSnapshot } from "@/lib/monitoring";
import { getPublicConfigStatus } from "@/lib/config";
import { getRequestId, withCorrelationHeaders } from "@/lib/correlation";

export async function GET(request: Request) {
  const reqId = getRequestId(request as any);
  const token = request.headers.get("cookie")?.split("backhaul_token=")[1]?.split(";")[0];
  const auth = await readToken(token);

  if (!auth || auth.accountRole !== "ADMIN") {
    const response = NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 }
    );
    return withCorrelationHeaders(response, reqId);
  }

  const metrics = getMetricsSnapshot();
  const systemStatus = getPublicConfigStatus();

  const response = NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    system: systemStatus,
    metrics,
  });

  return withCorrelationHeaders(response, reqId);
}
