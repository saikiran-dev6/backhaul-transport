import { NextRequest, NextResponse } from "next/server";

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`;
  }
  return `req_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 13)}`;
}

export function getRequestId(request: NextRequest | Request): string {
  const existing = request.headers.get("x-request-id") || request.headers.get("x-correlation-id");
  if (existing && existing.trim().length > 0) {
    return existing.trim();
  }
  return generateRequestId();
}

export function withCorrelationHeaders(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}
