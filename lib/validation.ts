import { z } from "zod";

export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const registerSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email(),
  password: z.string().regex(passwordPattern, "Use 8+ characters with uppercase, lowercase, number and special character"),
  role: z.enum(["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT"]),
  language: z.enum(["en", "te", "hi"]).default("en"),
  otpMethod: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
});

export const locationSchema = z.object({ name: z.string().min(2), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
