import { NextResponse } from "next/server";
import { createToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRoleList, roleRequiresSelection } from "@/lib/roles";

export async function POST(request: Request) {
  const { identifier, otp } = await request.json();
  const user = await db.user.findFirst({ where: { OR: [{ email: String(identifier).toLowerCase() }, { phone: String(identifier) }] } });
  if (!user || user.otpCode !== String(otp) || !user.otpExpiresAt || user.otpExpiresAt < new Date()) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { otpVerified: true, otpCode: null, otpExpiresAt: null } });
  const availableRoles = parseRoleList(user.roles, user.role);
  const sessionRole = roleRequiresSelection(user.role) ? undefined : availableRoles[0];
  const token = await createToken({ userId: user.id, role: user.role, name: user.fullName, sr: sessionRole });
  const response = NextResponse.json({ message: "Account verified", role: user.role, sessionRole, availableRoles, requiresRoleSelection: !sessionRole });
  response.cookies.set("backhaul_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
  return response;
}
