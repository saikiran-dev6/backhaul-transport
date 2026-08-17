import { NextRequest } from "next/server";
import { createToken, requestUser, setAuthCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRoleList } from "@/lib/roles";
import { sessionRoleSchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { logSecurityAudit } from "@/lib/auditLog";

const schema = sessionRoleSchema;

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Login required", 401);

  const body = await request.json();
  const parsed = schema.safeParse(body.role);
  if (!parsed.success) return apiError("Choose a valid Backhaul role", 400, parsed.error.issues);

  const user = await db.user.findUnique({ where: { id: auth.userId }, select: { fullName: true, role: true, roles: true } });
  if (!user) return apiError("Login required", 401);

  const availableRoles = parseRoleList(user.roles, user.role);
  if (!availableRoles.includes(parsed.data)) return apiError("This account cannot use that role", 403);

  const token = await createToken({ userId: auth.userId, role: user.role, name: user.fullName, sr: parsed.data });
  await logSecurityAudit("SESSION_ROLE_CHANGED", { userId: auth.userId, metadata: { oldRole: auth.role, newRole: parsed.data } });

  const response = apiSuccess({ sessionRole: parsed.data, availableRoles }, "Session role selected");
  setAuthCookie(response, token);
  return response;
}
