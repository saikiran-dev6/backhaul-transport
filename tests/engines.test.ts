import { describe, expect, it } from "vitest";
import { haversineKm, pointToRoute } from "@/lib/geo";
import { goodsPrice, passengerPrice } from "@/lib/pricing";

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
});
