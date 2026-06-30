import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { parseRoleList, roleRequiresSelection } from "@/lib/roles";

export async function POST(request: Request) {
  const { identifier, password } = await request.json();
  if (!identifier || !password) return NextResponse.json({ error: "Email, phone, or username and password are required" }, { status: 400 });
  const rawIdentifier = String(identifier).trim();
  const phoneIdentifier = rawIdentifier.replace(/\D/g, "");
  const lookup: Array<{ email?: string; username?: string; phone?: string }> = [{ email: rawIdentifier.toLowerCase() }, { username: rawIdentifier }];
  if (phoneIdentifier) lookup.push({ phone: phoneIdentifier });
  const user = await db.user.findFirst({
    where: { OR: lookup },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: "Invalid credentials. Please check your login details or create a new account." }, { status: 401 });
  if (!user.otpVerified) return NextResponse.json({ error: "Verify your OTP first", requiresOtp: true, email: user.email }, { status: 403 });
  const availableRoles = parseRoleList(user.roles, user.role);
  const sessionRole = roleRequiresSelection(user.role) ? undefined : availableRoles[0];
  const token = await createToken({ userId: user.id, role: user.role, name: user.fullName, sr: sessionRole });
  const response = NextResponse.json({ user: { id: user.id, name: user.fullName, role: user.role, sessionRole, availableRoles, language: user.language }, requiresRoleSelection: !sessionRole });
  response.cookies.set("backhaul_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
  return response;
}
