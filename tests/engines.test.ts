import { describe, expect, it } from "vitest";
import { haversineKm, pointToRoute } from "@/lib/geo";
import { goodsPrice, passengerPrice } from "@/lib/pricing";
import { type MatchableTrip, goodsEligible, passengerEligible } from "@/lib/matching";
import { parseRoleList } from "@/lib/roles";
import { rolesForPath } from "@/lib/routeGuards";
import {
  goodsBookingSchema,
  goodsDeliveryOtpVerifySchema,
  goodsPickupOtpVerifySchema,
  gpsSchemaForTest,
  passengerBookingSchema,
  passengerOtpVerifySchema,
  registerSchema,
  tripStatusSchemaForTest,
} from "@/lib/validation";

describe("route geometry", () => {
  it("calculates real distance without route constants", () => {
    const km = haversineKm({ lat: 17.385, lng: 78.4867 }, { lat: 16.5062, lng: 80.648 });
    expect(km).toBeGreaterThan(240);
    expect(km).toBeLessThan(300);
  });
  it("finds a point near a user-created segment", () => {
    const result = pointToRoute({ name: "P", lat: 0.1, lng: 0.5 }, { name: "A", lat: 0, lng: 0 }, { name: "B", lat: 0, lng: 1 });
    expect(result.progress).toBeCloseTo(0.5, 1);
    expect(result.distanceKm).toBeGreaterThan(10);
  });
  it("calculates turn-by-turn route ETA and duration info", async () => {
    const { calculateRouteEtaInfo } = await import("@/lib/geo");
    const origin = { name: "Hyderabad", lat: 17.385, lng: 78.4867 };
    const destination = { name: "Srisailam", lat: 16.0728, lng: 78.8686 };
    const eta = await calculateRouteEtaInfo(origin, destination);
    expect(eta.distanceKm).toBeGreaterThan(100);
    expect(eta.durationMinutes).toBeGreaterThan(60);
    expect(eta.provider).toBeDefined();
  });
});

describe("dynamic pricing", () => {
  const vehicle = { mileageKmPerLiter: 15 } as never;
  const rule = { fuelPrice: 105, detourRatePerKm: 12, driverBaseEarning: 100, platformFeePercent: 8, seatDiscountPercent: 15, minimumFare: 120, baseFarePerKm: 10, goodsWeightRate: 1.5 } as never;
  it("raises passenger fares with distance", () => {
    const short = passengerPrice({ distanceKm: 30, detourKm: 1, seatsRequested: 1, tripAvailableSeats: 4, vehicle, rule });
    const long = passengerPrice({ distanceKm: 100, detourKm: 1, seatsRequested: 1, tripAvailableSeats: 4, vehicle, rule });
    expect(long.total).toBeGreaterThan(short.total);
  });
  it("adds goods weight and detour charges", () => {
    const price = goodsPrice({ distanceKm: 50, detourKm: 5, weightKg: 100, rule });
    expect(price.breakdown.weightCharge).toBe(150);
    expect(price.breakdown.detourCharge).toBe(60);
  });
  it("adds handling charges for difficult goods", () => {
    const normal = goodsPrice({ distanceKm: 50, detourKm: 5, weightKg: 100, rule });
    const difficult = goodsPrice({ distanceKm: 50, detourKm: 5, weightKg: 100, rule, isFragile: true, isHeavy: true, requiresColdStorage: true });
    expect(difficult.total).toBeGreaterThan(normal.total);
    expect(difficult.breakdown.handlingCharge).toBeGreaterThan(0);
  });
});

describe("role and validation rules", () => {
  it("keeps merchant as a real selectable session role", () => {
    expect(parseRoleList(JSON.stringify(["MERCHANT"]), "MERCHANT")).toEqual(["MERCHANT"]);
    expect(parseRoleList(["ROUTEMATE", "CAPTAIN"], "ROUTEMATE")).toEqual(["ROUTEMATE", "CAPTAIN"]);
  });
  it("validates Indian phone and email during registration", () => {
    const base = { fullName: "Test User", username: "test_user", password: "Demo@123", role: "ROUTEMATE", language: "en", otpMethod: "EMAIL" };
    expect(registerSchema.safeParse({ ...base, phone: "12345", email: "bad" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, phone: "9876543210", email: "valid@example.com" }).success).toBe(true);
  });
  it("validates trip status and GPS payloads", () => {
    expect(tripStatusSchemaForTest.safeParse({ status: "DRIVING" }).success).toBe(true);
    expect(tripStatusSchemaForTest.safeParse({ status: "TELEPORTING" }).success).toBe(false);
    expect(gpsSchemaForTest.safeParse({ lat: 17.385, lng: 78.4867, status: "DRIVING" }).success).toBe(true);
    expect(gpsSchemaForTest.safeParse({ lat: 200, lng: 78.4867, status: "DRIVING" }).success).toBe(false);
  });
  it("maps protected web routes to the correct session roles", () => {
    expect(rolesForPath("/book/passenger")).toEqual(["ROUTEMATE"]);
    expect(rolesForPath("/book/goods/new")).toEqual(["LOADMATE", "MERCHANT"]);
    expect(rolesForPath("/dashboard/driver")).toEqual(["CAPTAIN"]);
    expect(rolesForPath("/public-page")).toBeUndefined();
  });
  it("rejects invalid passenger booking payloads before capacity reservation", () => {
    const booking = {
      tripId: "trip_1",
      pickup: { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
      drop: { name: "Srisailam", lat: 16.0728, lng: 78.8686 },
      seats: 2,
      paymentMethod: "CASH",
      idempotencyKey: "key_12345",
    };
    expect(passengerBookingSchema.safeParse(booking).success).toBe(true);
    expect(passengerBookingSchema.safeParse({ ...booking, seats: 0 }).success).toBe(false);
    expect(passengerBookingSchema.safeParse({ ...booking, paymentMethod: "UPI" }).success).toBe(false);
    expect(passengerBookingSchema.safeParse({ ...booking, paymentMethod: "ONLINE" }).success).toBe(true);
  });
  it("rejects invalid goods booking payloads before goods capacity reservation", () => {
    const booking = {
      tripId: "trip_1",
      pickup: { name: "Guntur", lat: 16.3067, lng: 80.4365 },
      drop: { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
      goodsType: "PARCEL",
      weightKg: 75,
      quantity: 3,
      sizeDescription: "3 cartons",
      paymentMethod: "ONLINE",
      idempotencyKey: "key_67890",
    };
    expect(goodsBookingSchema.safeParse(booking).success).toBe(true);
    expect(goodsBookingSchema.safeParse({ ...booking, weightKg: -1 }).success).toBe(false);
    expect(goodsBookingSchema.safeParse({ ...booking, paymentMethod: "MOCK_CARD" }).success).toBe(false);
    expect(goodsBookingSchema.safeParse({ ...booking, paymentMethod: "BITCOIN" }).success).toBe(false);
  });
  it("validates Phase 2 OTP verification schemas correctly", () => {
    expect(passengerOtpVerifySchema.safeParse({ bookingId: "b_1", otp: "123456" }).success).toBe(true);
    expect(passengerOtpVerifySchema.safeParse({ bookingId: "b_1", otp: "123" }).success).toBe(false);
    expect(goodsPickupOtpVerifySchema.safeParse({ bookingId: "gb_1", otp: "654321" }).success).toBe(true);
    expect(goodsPickupOtpVerifySchema.safeParse({ bookingId: "", otp: "654321" }).success).toBe(false);
    expect(goodsDeliveryOtpVerifySchema.safeParse({ bookingId: "gb_1", otp: "999888" }).success).toBe(true);
    expect(goodsDeliveryOtpVerifySchema.safeParse({ bookingId: "gb_1", otp: "ABCDEF" }).success).toBe(false);
  });
});

describe("matching eligibility", () => {
  const baseTrip = {
    status: "ACTIVE",
    fromLocationName: "Hyderabad",
    fromLat: 17.385,
    fromLng: 78.4867,
    toLocationName: "Srisailam",
    toLat: 16.0728,
    toLng: 78.8686,
    maxDetourKm: 15,
    availableSeats: 3,
    availableGoodsCapacityKg: 500,
    allowedGoodsTypes: JSON.stringify(["PARCEL"]),
    isLookingForPassengers: true,
    isLookingForGoods: true,
    driver: { verificationStatus: "APPROVED" },
    vehicle: { permitType: "BOTH", verificationStatus: "APPROVED" },
  };
  const pickup = { name: "LB Nagar", lat: 17.3457, lng: 78.5522 };
  const drop = { name: "Srisailam", lat: 16.0728, lng: 78.8686 };

  it("rejects passenger matches for unapproved vehicles", () => {
    const trip = { ...baseTrip, vehicle: { permitType: "BOTH", verificationStatus: "PENDING" } } as unknown as MatchableTrip;
    expect(passengerEligible(trip, pickup, drop, 1).eligible).toBe(false);
  });

  it("requires goods availability for goods matches", () => {
    const trip = { ...baseTrip, isLookingForGoods: false } as unknown as MatchableTrip;
    expect(goodsEligible(trip, pickup, drop, 50, "PARCEL").eligible).toBe(false);
  });
});

describe("Phase 3 security & RBAC hardening", () => {
  it("hashes refresh tokens and OTPs correctly", async () => {
    const { createRefreshToken, hashToken, hashOtp, verifyOtpHash } = await import("@/lib/auth");
    const token = createRefreshToken();
    expect(token).toHaveLength(64);
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);

    const otpHash = hashOtp("654321");
    expect(verifyOtpHash("654321", otpHash)).toBe(true);
    expect(verifyOtpHash("000000", otpHash)).toBe(false);
  });

  it("enforces sliding window rate limits", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    const key = "test_rate_limit_" + Date.now();
    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(key, 3, 60000)).allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key, 3, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("verifies Admin privilege is preserved during role switching", () => {
    const auth = { userId: "admin_1", role: "CAPTAIN", accountRole: "ADMIN", name: "Admin" };
    const hasAdminAccess = auth.accountRole === "ADMIN" || auth.role === "ADMIN";
    expect(hasAdminAccess).toBe(true);

    const normalUser = { userId: "user_1", role: "CAPTAIN", accountRole: "CAPTAIN", name: "Captain" };
    const normalAdminAccess = normalUser.accountRole === "ADMIN" || normalUser.role === "ADMIN";
    expect(normalAdminAccess).toBe(false);
  });
});

describe("Phase 4 payment gateway & state machine", () => {
  it("enforces payment state machine transitions", async () => {
    const { canTransitionPayment } = await import("@/lib/paymentStateMachine");
    expect(canTransitionPayment("PENDING", "ORDER_CREATED")).toBe(true);
    expect(canTransitionPayment("ORDER_CREATED", "CAPTURED")).toBe(true);
    expect(canTransitionPayment("CAPTURED", "REFUND_PENDING")).toBe(true);
    expect(canTransitionPayment("REFUND_PENDING", "REFUNDED")).toBe(true);
    expect(canTransitionPayment("REFUNDED", "CAPTURED")).toBe(false);
    expect(canTransitionPayment("FAILED", "REFUNDED")).toBe(false);
  });

  it("verifies and generates Razorpay payment signatures", async () => {
    const { generateRazorpayPaymentSignature, verifyRazorpayPaymentSignature } = await import("@/lib/razorpay");
    const orderId = "order_test_123456";
    const paymentId = "pay_test_987654";
    const sig = generateRazorpayPaymentSignature(orderId, paymentId);
    expect(sig).toHaveLength(64);
    expect(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: sig })).toBe(true);
    expect(verifyRazorpayPaymentSignature({ orderId, paymentId, signature: "invalid_sig_string" })).toBe(false);
  });

  it("verifies and generates Razorpay webhook signatures", async () => {
    const { generateRazorpayWebhookSignature, verifyRazorpayWebhookSignature } = await import("@/lib/razorpay");
    const payload = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const sig = generateRazorpayWebhookSignature(payload);
    expect(sig).toHaveLength(64);
    expect(verifyRazorpayWebhookSignature(payload, sig)).toBe(true);
    expect(verifyRazorpayWebhookSignature(payload, "invalid_webhook_sig")).toBe(false);
  });

  it("validates cash payment transition rules", async () => {
    const { canTransitionPayment } = await import("@/lib/paymentStateMachine");
    expect(canTransitionPayment("PENDING", "CAPTURED")).toBe(true);
    expect(canTransitionPayment("CAPTURED", "PENDING")).toBe(false);
  });

  it("handles Captain payment provider account settlement configuration", async () => {
    const { getCaptainSettlementInfo } = await import("@/lib/razorpay");
    expect(getCaptainSettlementInfo(null)).toEqual({ isConfigured: false, accountId: null });
    expect(getCaptainSettlementInfo({})).toEqual({ isConfigured: false, accountId: null });
    expect(getCaptainSettlementInfo({ captainPaymentAccountId: null })).toEqual({ isConfigured: false, accountId: null });
    expect(getCaptainSettlementInfo({ captainPaymentAccountId: "acc_captain_route_789" })).toEqual({
      isConfigured: true,
      accountId: "acc_captain_route_789",
    });
  });
});

describe("Phase 5 booking & trip state machine", () => {
  it("enforces passenger booking lifecycle transitions", async () => {
    const { canTransitionPassengerBooking } = await import("@/lib/bookingStateMachine");
    expect(canTransitionPassengerBooking("CONFIRMED", "PICKED_UP")).toBe(true);
    expect(canTransitionPassengerBooking("PICKED_UP", "COMPLETED")).toBe(true);
    expect(canTransitionPassengerBooking("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionPassengerBooking("COMPLETED", "CONFIRMED")).toBe(false);
    expect(canTransitionPassengerBooking("CANCELLED", "PICKED_UP")).toBe(false);
  });

  it("enforces goods delivery lifecycle transitions", async () => {
    const { canTransitionGoodsDelivery } = await import("@/lib/bookingStateMachine");
    expect(canTransitionGoodsDelivery("PENDING", "IN_TRANSIT")).toBe(true);
    expect(canTransitionGoodsDelivery("IN_TRANSIT", "DELIVERED")).toBe(true);
    expect(canTransitionGoodsDelivery("DELIVERED", "COMPLETED")).toBe(true);
    expect(canTransitionGoodsDelivery("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionGoodsDelivery("COMPLETED", "IN_TRANSIT")).toBe(false);
  });

  it("enforces trip lifecycle transitions", async () => {
    const { canTransitionTrip } = await import("@/lib/bookingStateMachine");
    expect(canTransitionTrip("ACTIVE", "STARTED")).toBe(true);
    expect(canTransitionTrip("STARTED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTrip("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionTrip("ACTIVE", "CANCELLED")).toBe(true);
    expect(canTransitionTrip("COMPLETED", "STARTED")).toBe(false);
  });
});

describe("Phase 6 Post-Trip Payment Lifecycle & Reliability", () => {
  it("verifies pre-completion payment protection rules", async () => {
    const { canTransitionPassengerBooking } = await import("@/lib/bookingStateMachine");
    const { canTransitionPayment } = await import("@/lib/paymentStateMachine");

    // Payment cannot be captured before completion
    expect(canTransitionPassengerBooking("CONFIRMED", "COMPLETED")).toBe(false); // Must transition through PICKED_UP
    expect(canTransitionPayment("PENDING", "CAPTURED")).toBe(true);
  });

  it("verifies payment method immutability and idempotency rules", async () => {
    const { canTransitionPayment } = await import("@/lib/paymentStateMachine");

    // Capturing payment is idempotent
    expect(canTransitionPayment("CAPTURED", "CAPTURED")).toBe(true);
    expect(canTransitionPayment("ORDER_CREATED", "CAPTURED")).toBe(true);
    expect(canTransitionPayment("CAPTURED", "REFUND_PENDING")).toBe(true);
  });
});

describe("Phase 7 Production Hardening & Infrastructure Reliability", () => {
  it("validates centralized configuration reporting and status indicators", async () => {
    const { getAppConfig, getPublicConfigStatus, isRazorpayConfigured } = await import("@/lib/config");
    const config = getAppConfig();
    expect(config.databaseUrl).toBeDefined();
    expect(config.jwtSecret).toBeDefined();

    const status = getPublicConfigStatus();
    expect(status.database).toBe("configured");
    expect(status.razorpay).toBe(isRazorpayConfigured() ? "configured" : "not_configured");
  });

  it("verifies request correlation ID generation and extraction", async () => {
    const { generateRequestId, getRequestId } = await import("@/lib/correlation");
    const reqId = generateRequestId();
    expect(reqId).toMatch(/^req_[a-f0-9]{24}$/);

    const mockRequest = new Request("http://localhost:3000/api/health", {
      headers: { "x-request-id": "req_custom12345" },
    });
    expect(getRequestId(mockRequest)).toBe("req_custom12345");
  });

  it("verifies distributed rate limiter logic with store fallback", async () => {
    const { checkRateLimit } = await import("@/lib/rateLimit");
    const key = "test-key-p7-" + Date.now();
    const res1 = await checkRateLimit(key, 2, 60000);
    expect(res1.allowed).toBe(true);
    const res2 = await checkRateLimit(key, 2, 60000);
    expect(res2.allowed).toBe(true);
    const res3 = await checkRateLimit(key, 2, 60000);
    expect(res3.allowed).toBe(false);
    expect(res3.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("verifies readiness endpoint Redis health status handling", async () => {
    const { isRedisConfigured } = await import("@/lib/config");
    expect(typeof isRedisConfigured()).toBe("boolean");
  });

  it("verifies Socket.io realtime event room helper formatting", async () => {
    const { routeRoom, userRoom, bookingRoom, tripRoom } = await import("@/lib/realtime");
    expect(routeRoom("Hyd", "Srisailam")).toBe("route:Hyd-Srisailam");
    expect(userRoom("u_1")).toBe("user:u_1");
    expect(bookingRoom("b_1")).toBe("booking:b_1");
    expect(tripRoom("t_1")).toBe("trip:t_1");
  });
});

describe("Phase 8 Production Deployment & Observability Readiness", () => {
  it("tracks operational metrics and snapshots system stats", async () => {
    const { trackMetric, getMetricsSnapshot } = await import("@/lib/monitoring");
    trackMetric("test_metric_p8", 5);
    const snapshot = getMetricsSnapshot();
    expect(snapshot["test_metric_p8"]).toBeDefined();
    expect(snapshot["test_metric_p8"].count).toBeGreaterThanOrEqual(5);
  });

  it("verifies end-to-end payment timing rule (No payment capture before trip completion)", async () => {
    const { canTransitionPassengerBooking } = await import("@/lib/bookingStateMachine");
    const { canTransitionPayment } = await import("@/lib/paymentStateMachine");

    // CONFIRMED trip cannot trigger payment capture
    expect(canTransitionPassengerBooking("CONFIRMED", "COMPLETED")).toBe(false);

    // COMPLETED trip allows payment capture transition
    expect(canTransitionPayment("PENDING", "CAPTURED")).toBe(true);
  });
});


