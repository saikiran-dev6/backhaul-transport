import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createRefreshToken, createToken, hashToken, setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { parseRoleList, roleRequiresSelection } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { checkRateLimit } from "@/lib/rateLimit";
import { logSecurityAudit } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rate = await checkRateLimit(`refresh_${ip}`, 30, 15 * 60 * 1000);
  if (!rate.allowed) {
    return apiError(`Too many refresh attempts. Retry in ${rate.retryAfterSeconds}s`, 429);
  }

  let bodyToken: string | undefined;
  try {
    const body = await request.json();
    bodyToken = body?.refreshToken;
  } catch {}

  const rawRefreshToken = request.cookies.get("backhaul_refresh_token")?.value || bodyToken;
  if (!rawRefreshToken) {
    return apiError("Refresh token missing", 401);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await db.authSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    await logSecurityAudit("REFRESH_TOKEN_NOT_FOUND", { ipAddress: ip });
    const response = apiError("Invalid refresh token", 401);
    clearAuthCookies(response);
    return response;
  }

  // REPLAY DETECTION: Token was already revoked
  if (session.revokedAt) {
    await logSecurityAudit("REFRESH_REPLAY_DETECTED", {
      userId: session.userId,
      ipAddress: ip,
      metadata: { familyId: session.familyId },
    });
    // Invalidate entire token family to protect against token theft
    await db.authSession.updateMany({
      where: { familyId: session.familyId },
      data: { revokedAt: new Date() },
    });
    const response = apiError("Refresh token reuse detected. All sessions revoked for security.", 401);
    clearAuthCookies(response);
    return response;
  }

  // Expired Token Check
  if (session.expiresAt < new Date()) {
    await logSecurityAudit("REFRESH_TOKEN_EXPIRED", { userId: session.userId, ipAddress: ip });
    const response = apiError("Refresh token expired. Please log in again.", 401);
    clearAuthCookies(response);
    return response;
  }

  // Rotate Refresh Token
  const newRefreshToken = createRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const availableRoles = parseRoleList(session.user.roles, session.user.role);
  const sessionRole = roleRequiresSelection(session.user.role) ? undefined : availableRoles[0];
  const newAccessToken = await createToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.fullName,
    sr: sessionRole,
  });

  await db.$transaction([
    db.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    }),
    db.authSession.create({
      data: {
        userId: session.userId,
        tokenHash: newTokenHash,
        familyId: session.familyId,
        expiresAt: newExpiresAt,
        userAgent: request.headers.get("user-agent") || null,
      },
    }),
  ]);

  await logSecurityAudit("REFRESH_SUCCESS", { userId: session.userId, ipAddress: ip });

  const response = apiSuccess({ accessToken: newAccessToken, refreshToken: newRefreshToken }, "Token refreshed successfully");
  setAuthCookies(response, newAccessToken, newRefreshToken);
  return response;
}
