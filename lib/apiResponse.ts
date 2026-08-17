import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;

export function apiSuccess<T extends JsonRecord>(
  data: T,
  message = "Action completed successfully",
  init?: ResponseInit,
) {
  return NextResponse.json({ success: true, message, data, ...data }, init);
}

export function apiError(message: string, status = 400, errors: unknown[] = []) {
  return NextResponse.json({ success: false, message, errors, error: message }, { status });
}
