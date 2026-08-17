import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export type AuthPayload = { userId: string; role: string; name: string; sr?: string; accountRole?: string };

function getSecret() {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return new TextEncoder().encode("backhaul-local-development-secret-change-me");
  }
  return new TextEncoder().encode(secretStr);
}

export async function createToken(payload: AuthPayload) {
  const secret = getSecret();
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(secret);
}

export function createRefreshToken(): string {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(`backhaul_otp_salt_${otp}`).digest("hex");
}

export function verifyOtpHash(submittedOtp: string, storedHash?: string | null, storedPlaintextOtp?: string | null): boolean {
  if (storedHash) {
    const computed = hashOtp(submittedOtp);
    if (computed === storedHash) return true;
  }
  if (storedPlaintextOtp && submittedOtp === storedPlaintextOtp) return true;
  return false;
}

export async function readToken(token?: string | null): Promise<AuthPayload | null> {
  if (!token) return null;
  try {
    const secret = getSecret();
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
  response.cookies?.set("backhaul_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 900, // 15 minutes
    path: "/",
  });
}

export function setAuthCookies(response: Response & { cookies?: { set: (...args: any[]) => void } }, accessToken: string, refreshToken: string) {
  response.cookies?.set("backhaul_token", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 900, // 15 minutes
    path: "/",
  });

  response.cookies?.set("backhaul_refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 604800, // 7 days
    path: "/",
  });
}

export function clearAuthCookies(response: Response & { cookies?: { set: (...args: any[]) => void; delete?: (...args: any[]) => void } }) {
  response.cookies?.set("backhaul_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies?.set("backhaul_refresh_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
}
