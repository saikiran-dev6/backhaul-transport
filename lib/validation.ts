import { z } from "zod";

export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const sessionRoleSchema = z.enum(["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT", "ADMIN"]);
export const accountRoleSchema = z.enum(["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT"]);

export const registerSchema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email(),
  password: z.string().regex(passwordPattern, "Use 8+ characters with uppercase, lowercase, number and special character"),
  role: accountRoleSchema,
  language: z.enum(["en", "te", "hi"]).default("en"),
  otpMethod: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
});

export const locationSchema = z.object({ name: z.string().min(2), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email, phone, or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const passengerMatchSchema = z.object({
  pickup: locationSchema,
  drop: locationSchema,
  departureTime: z.string().datetime(),
  seats: z.number().int().min(1).max(8),
  luggageSize: z.string().default("SMALL"),
  isLookingForRide: z.boolean().default(true),
});

export const goodsMatchSchema = z.object({
  pickup: locationSchema,
  drop: locationSchema,
  departureTime: z.string().datetime().optional(),
  goodsType: z.string().min(2),
  weightKg: z.number().positive(),
  quantity: z.number().int().positive(),
  sizeDescription: z.string().min(2),
  imageUrl: z.string().optional(),
  isFragile: z.boolean().default(false),
  requiresColdStorage: z.boolean().default(false),
  isHeavy: z.boolean().default(false),
});

export const tripPostSchema = z.object({
  vehicleId: z.string().min(1),
  from: locationSchema,
  to: locationSchema,
  departureTime: z.string().datetime(),
  availableSeats: z.number().int().min(0),
  availableGoodsCapacityKg: z.number().min(0),
  maxDetourKm: z.number().min(0).max(100),
  allowedPickupPoints: z.array(z.string()).default([]),
  allowedDropPoints: z.array(z.string()).default([]),
  allowedGoodsTypes: z.array(z.string()).default([]),
});

export const passengerBookingSchema = z.object({
  tripId: z.string(),
  pickup: locationSchema,
  drop: locationSchema,
  seats: z.number().int().min(1),
  paymentMethod: z.enum(["CASH", "ONLINE"]).default("CASH"),
  idempotencyKey: z.string().optional(),
});

export const goodsBookingSchema = goodsMatchSchema.extend({
  tripId: z.string(),
  paymentMethod: z.enum(["CASH", "ONLINE"]).default("CASH"),
  idempotencyKey: z.string().optional(),
});

export const captainAvailabilitySchema = z.object({ isLookingForPassengers: z.boolean() });
export const passengerAvailabilitySchema = z.object({ isLookingForRide: z.boolean() });

export const passengerOtpVerifySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const goodsPickupOtpVerifySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const goodsDeliveryOtpVerifySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const tripStatusSchemaForTest = z.object({ status: z.enum(["ACTIVE", "DRIVING", "PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });
export const gpsSchemaForTest = z.object({
  tripId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: z.enum(["IDLE", "LOOKING", "DRIVING", "OFFLINE"]).default("DRIVING"),
});
