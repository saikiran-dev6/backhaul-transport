import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clearAuthCookies, hashToken, requestUser } from "@/lib/auth";
import { apiSuccess } from "@/lib/apiResponse";
import { logSecurityAudit } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  const rawRefreshToken = request.cookies.get("backhaul_refresh_token")?.value;

  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await db.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  if (auth) {
    await logSecurityAudit("LOGOUT", { userId: auth.userId });
  }

  const response = apiSuccess({}, "Logged out successfully");
  clearAuthCookies(response);
  return response;
}
