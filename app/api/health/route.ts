import { NextResponse } from "next/server";
import { getRequestId, withCorrelationHeaders } from "@/lib/correlation";

export async function GET(request: Request) {
  const reqId = getRequestId(request as any);
  const response = NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "backhaul-api",
    version: "1.0.0",
  });
  return withCorrelationHeaders(response, reqId);
}
