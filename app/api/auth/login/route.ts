import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { createRefreshToken, createToken, hashToken, setAuthCookies } from "@/lib/auth";
import { parseRoleList, roleRequiresSelection } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { logSecurityAudit } from "@/lib/auditLog";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rate = await checkRateLimit(`login_${ip}`, 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    await logSecurityAudit("LOGIN_RATE_LIMITED", { ipAddress: ip });
    return apiError(`Too many login attempts. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Email, phone, or username and password are required", 400, parsed.error.issues);
  
  const { identifier, password } = parsed.data;
  const rawIdentifier = String(identifier).trim();
  const phoneIdentifier = rawIdentifier.replace(/\D/g, "");
  const lookup: Array<{ email?: string; username?: string; phone?: string }> = [{ email: rawIdentifier.toLowerCase() }, { username: rawIdentifier }];
  if (phoneIdentifier) lookup.push({ phone: phoneIdentifier });
  
  const user = await db.user.findFirst({ where: { OR: lookup } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await logSecurityAudit("LOGIN_FAILED", { ipAddress: ip, metadata: { identifier: rawIdentifier } });
    return apiError("Invalid credentials. Please check your login details or create a new account.", 401);
  }
  
  if (!user.otpVerified) return apiError("Verify your OTP first", 403, [{ requiresOtp: true, email: user.email }]);

  const availableRoles = parseRoleList(user.roles, user.role);
  const sessionRole = roleRequiresSelection(user.role) ? undefined : availableRoles[0];
  
  // Create 15-min access token
  const accessToken = await createToken({ userId: user.id, role: user.role, name: user.fullName, sr: sessionRole });
  
  // Create 7-day refresh token & AuthSession
  const refreshToken = createRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.authSession.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: request.headers.get("user-agent") || null,
    },
  });

  await logSecurityAudit("LOGIN_SUCCESS", { userId: user.id, ipAddress: ip });

  const response = apiSuccess({ user: { id: user.id, name: user.fullName, role: user.role, sessionRole, availableRoles, language: user.language }, requiresRoleSelection: !sessionRole }, "Login successful");
  setAuthCookies(response, accessToken, refreshToken);
  return response;
}
