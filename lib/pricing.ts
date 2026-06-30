import type { PricingRule, Vehicle } from "@prisma/client";

const money = (value: number) => Math.round(value * 100) / 100;

export function passengerPrice(input: {
  distanceKm: number;
  detourKm: number;
  seatsRequested: number;
  tripAvailableSeats: number;
  vehicle: Vehicle;
  rule: PricingRule;
}) {
  const { distanceKm, detourKm, seatsRequested, tripAvailableSeats, vehicle, rule } = input;
  const fuelCost = (distanceKm / Math.max(vehicle.mileageKmPerLiter, 1)) * rule.fuelPrice;
  const tollEstimate = distanceKm > 120 ? 120 : distanceKm > 60 ? 60 : 0;
  const detourCost = detourKm * rule.detourRatePerKm;
  const subtotal = fuelCost + tollEstimate + rule.driverBaseEarning + detourCost;
  const platformFee = subtotal * (rule.platformFeePercent / 100);
  const perSeat = (subtotal + platformFee) / Math.max(tripAvailableSeats, 1);
  const discount = perSeat * (rule.seatDiscountPercent / 100);
  const total = Math.max(rule.minimumFare, (perSeat - discount) * seatsRequested);
  return {
    total: money(total),
    breakdown: {
      fuelCost: money(fuelCost), tollEstimate: money(tollEstimate), driverEarning: money(rule.driverBaseEarning),
      detourCost: money(detourCost), platformFee: money(platformFee), returnTripDiscount: money(discount * seatsRequested),
    },
  };
}

export function goodsPrice(input: { distanceKm: number; detourKm: number; weightKg: number; rule: PricingRule }) {
  const { distanceKm, detourKm, weightKg, rule } = input;
  const baseFare = rule.minimumFare;
  const distanceCharge = distanceKm * rule.baseFarePerKm;
  const weightCharge = weightKg * rule.goodsWeightRate;
  const detourCharge = detourKm * rule.detourRatePerKm;
  const subtotal = baseFare + distanceCharge + weightCharge + detourCharge;
  const platformFee = subtotal * (rule.platformFeePercent / 100);
  return {
    total: money(subtotal + platformFee),
    breakdown: { baseFare: money(baseFare), distanceCharge: money(distanceCharge), weightCharge: money(weightCharge), detourCharge: money(detourCharge), platformFee: money(platformFee) },
  };
}
