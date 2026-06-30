import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export type AuthPayload = { userId: string; role: string; name: string; sr?: string; accountRole?: string };
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "backhaul-local-development-secret-change-me");

export async function createToken(payload: AuthPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret);
}

export async function readToken(token?: string | null): Promise<AuthPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const auth = payload as unknown as AuthPayload;
    return { ...auth, accountRole: auth.role, role: auth.sr || auth.role };
  } catch {
    return null;
  }
}

export async function requestUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return readToken(bearer || request.cookies.get("backhaul_token")?.value);
}

export function otpCode() {
  return process.env.NODE_ENV === "production" ? String(Math.floor(100000 + Math.random() * 900000)) : "123456";
}

export function setAuthCookie(response: Response & { cookies?: { set: (...args: any[]) => void } }, token: string) {
  response.cookies?.set("backhaul_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
}
