import type { ReturnTrip, Vehicle, DriverProfile } from "@prisma/client";
import { pointToRoute } from "@/lib/geo";
import type { LocationPoint } from "@/types";

export type MatchableTrip = ReturnTrip & { vehicle: Vehicle; driver: DriverProfile };

export function approvedForMarketplace(trip: MatchableTrip) {
  return trip.status === "ACTIVE" && trip.driver.verificationStatus === "APPROVED" && trip.vehicle.verificationStatus === "APPROVED";
}

export function routeFit(trip: MatchableTrip, pickup: LocationPoint, drop: LocationPoint) {
  const start = { name: trip.fromLocationName, lat: trip.fromLat, lng: trip.fromLng };
  const end = { name: trip.toLocationName, lat: trip.toLat, lng: trip.toLng };
  const pickupFit = pointToRoute(pickup, start, end);
  const dropFit = pointToRoute(drop, start, end);
  const detourKm = pickupFit.distanceKm + dropFit.distanceKm;
  return {
    pickupDistanceKm: pickupFit.distanceKm,
    dropDistanceKm: dropFit.distanceKm,
    detourKm,
    sameDirection: dropFit.progress > pickupFit.progress + 0.01,
    segmentProgress: Math.max(0, dropFit.progress - pickupFit.progress),
  };
}

export function passengerEligible(trip: MatchableTrip, pickup: LocationPoint, drop: LocationPoint, seats: number) {
  const fit = routeFit(trip, pickup, drop);
  const permit = ["PASSENGER", "BOTH"].includes(trip.vehicle.permitType);
  const proximityLimit = Math.min(trip.maxDetourKm, 15);
  return {
    ...fit,
    eligible: approvedForMarketplace(trip) && trip.isLookingForPassengers && permit && trip.availableSeats >= seats && fit.sameDirection && fit.detourKm <= proximityLimit,
  };
}

export function goodsEligible(trip: MatchableTrip, pickup: LocationPoint, drop: LocationPoint, weightKg: number, goodsType: string) {
  const fit = routeFit(trip, pickup, drop);
  const permit = ["GOODS", "BOTH"].includes(trip.vehicle.permitType);
  const allowed = JSON.parse(trip.allowedGoodsTypes || "[]") as string[];
  const goodsAllowed = !allowed.length || allowed.map((value) => value.toLowerCase()).includes(goodsType.toLowerCase());
  return {
    ...fit,
    eligible: approvedForMarketplace(trip) && trip.isLookingForGoods && permit && trip.availableGoodsCapacityKg >= weightKg && fit.sameDirection && fit.detourKm <= trip.maxDetourKm && goodsAllowed,
  };
}

export function recommendedVehicle(weightKg: number, size: string) {
  const normalized = size.toLowerCase();
  if (weightKg <= 10 && !normalized.includes("large")) return "BIKE";
  if (weightKg <= 150) return "GOODS_AUTO";
  if (weightKg <= 700) return "PICKUP";
  if (weightKg <= 1500) return "VAN";
  return "MINI_TRUCK";
}
