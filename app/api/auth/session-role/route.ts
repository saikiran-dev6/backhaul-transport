import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createToken, requestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRoleList } from "@/lib/roles";

const schema = z.object({ role: z.enum(["ROUTEMATE", "LOADMATE", "CAPTAIN", "ADMIN"]) });

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid Backhaul role" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: auth.userId }, select: { fullName: true, role: true, roles: true } });
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const availableRoles = parseRoleList(user.roles, user.role);
  if (!availableRoles.includes(parsed.data.role)) return NextResponse.json({ error: "This account cannot use that role" }, { status: 403 });

  const token = await createToken({ userId: auth.userId, role: user.role, name: user.fullName, sr: parsed.data.role });
  const response = NextResponse.json({ sessionRole: parsed.data.role, availableRoles });
  response.cookies.set("backhaul_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800, path: "/" });
  return response;
}
