import { createToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRoleList, roleRequiresSelection } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const rate = await checkRateLimit(`verify_otp_${ip}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many OTP verification attempts. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const { identifier, otp } = await request.json();
  const user = await db.user.findFirst({ where: { OR: [{ email: String(identifier).toLowerCase() }, { phone: String(identifier) }] } });
  if (!user || user.otpCode !== String(otp) || !user.otpExpiresAt || user.otpExpiresAt < new Date()) return apiError("Invalid or expired OTP", 400);
  await db.user.update({ where: { id: user.id }, data: { otpVerified: true, otpCode: null, otpExpiresAt: null } });
  const availableRoles = parseRoleList(user.roles, user.role);
  const sessionRole = roleRequiresSelection(user.role) ? undefined : availableRoles[0];
  const token = await createToken({ userId: user.id, role: user.role, name: user.fullName, sr: sessionRole });
  const response = apiSuccess({ role: user.role, sessionRole, availableRoles, requiresRoleSelection: !sessionRole }, "Account verified");
  response.cookies.set("backhaul_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
  return response;
}
