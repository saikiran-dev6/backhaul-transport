import { NextRequest } from "next/server";
import { requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRoleList } from "@/lib/roles";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Unauthorized", 401);
  const user = await db.user.findUnique({ where: { id: auth.userId }, select: { id: true, fullName: true, email: true, role: true, roles: true, language: true, driverProfile: { select: { verificationStatus: true } } } });
  if (!user) return apiError("Unauthorized", 401);
  return apiSuccess({ user: { ...user, accountRole: auth.accountRole || user.role, role: auth.role, sessionRole: auth.sr, availableRoles: parseRoleList(user.roles, user.role) } }, "Authenticated user loaded");
}
