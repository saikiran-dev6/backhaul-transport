import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { otpCode } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid registration details", 400, parsed.error.issues);
  const data = parsed.data;
  const conflict = await db.user.findFirst({ where: { OR: [{ username: data.username }, { phone: data.phone }, { email: data.email.toLowerCase() }] } });
  if (conflict) {
    const field = conflict.username === data.username ? "username" : conflict.phone === data.phone ? "phone" : "email";
    return apiError(`That ${field} is already registered`, 409, [{ field }]);
  }
  const otp = otpCode();
  const user = await db.user.create({
    data: {
      fullName: data.fullName, username: data.username, phone: data.phone, email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 10), role: data.role, roles: [data.role], language: data.language,
      otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      driverProfile: data.role === "CAPTAIN" ? { create: { verificationStatus: "PENDING" } } : undefined,
    },
    select: { id: true, email: true, phone: true, role: true },
  });
  return apiSuccess({ user, mockOtp: process.env.NODE_ENV === "production" ? undefined : otp }, `OTP sent by mock ${data.otpMethod.toLowerCase()}`, { status: 201 });
}
