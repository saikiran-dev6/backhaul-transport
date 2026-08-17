import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublicConfigStatus, isRedisConfigured, getAppConfig } from "@/lib/config";
import { getRequestId, withCorrelationHeaders } from "@/lib/correlation";

async function checkRedisHealth(): Promise<string> {
  if (!isRedisConfigured()) return "not_configured";
  const cfg = getAppConfig();
  const restUrl = cfg.upstashRedisRestUrl || (cfg.redisUrl && cfg.redisUrl.startsWith("http") ? cfg.redisUrl : null);
  const token = cfg.upstashRedisRestToken;
  if (!restUrl || !token) return "configured_fallback_memory";

  try {
    const response = await fetch(`${restUrl.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.ok) return "ok";
    return "error";
  } catch {
    return "error";
  }
}

export async function GET(request: Request) {
  const reqId = getRequestId(request as any);
  const configStatus = getPublicConfigStatus();
  const redisStatus = await checkRedisHealth();

  try {
    // Database connectivity check
    await db.$queryRaw`SELECT 1`;

    const response = NextResponse.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      components: {
        database: { status: "ok" },
        redis: { status: redisStatus },
        razorpay: { status: configStatus.razorpay },
      },
    });
    return withCorrelationHeaders(response, reqId);
  } catch (error: any) {
    const response = NextResponse.json(
      {
        status: "unready",
        timestamp: new Date().toISOString(),
        error: "Database connectivity check failed",
        components: {
          database: { status: "error" },
          redis: { status: redisStatus },
          razorpay: { status: configStatus.razorpay },
        },
      },
      { status: 503 }
    );
    return withCorrelationHeaders(response, reqId);
  }
}
