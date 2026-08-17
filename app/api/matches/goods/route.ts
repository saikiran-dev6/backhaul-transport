import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/auth";
import { goodsEligible, recommendedVehicle } from "@/lib/matching";
import { maskVehicleNumber } from "@/lib/geo";
import { goodsPrice } from "@/lib/pricing";
import { goodsMatchSchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Please login to access Backhaul services.", 401);
  if (!["LOADMATE", "MERCHANT"].includes(auth.role)) return apiError("You do not have permission to access this module.", 403);
  const parsed = goodsMatchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid search", 400, parsed.error.issues);
  const selected = parsed.data.departureTime ? new Date(parsed.data.departureTime) : new Date();
  const trips = await db.returnTrip.findMany({
    where: {
      status: "ACTIVE",
      isLookingForGoods: true,
      availableGoodsCapacityKg: { gte: parsed.data.weightKg },
      departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 7 * 86400000) },
      driver: { is: { verificationStatus: "APPROVED" } },
      vehicle: { is: { verificationStatus: "APPROVED", permitType: { in: ["GOODS", "BOTH"] } } },
    },
    include: { vehicle: true, driver: { include: { user: true } } },
  });
  const rules = await db.pricingRule.findMany();
  const fallback = rules.find((rule) => rule.vehicleType === "DEFAULT");
  const matches = [];
  for (const trip of trips) {
    const fit = goodsEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.weightKg, parsed.data.goodsType);
    if (!fit.eligible) continue;
    if (parsed.data.requiresColdStorage && !trip.vehicle.vehicleType.includes("REFRIGERATED")) continue;
    const rule = rules.find((item) => item.vehicleType === trip.vehicle.vehicleType) || fallback;
    if (!rule) continue;
    const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
    const priced = goodsPrice({ distanceKm, detourKm: fit.detourKm, weightKg: parsed.data.weightKg, rule, isFragile: parsed.data.isFragile, isHeavy: parsed.data.isHeavy, requiresColdStorage: parsed.data.requiresColdStorage });
    matches.push({ tripId: trip.id, driverName: trip.driver.user.fullName, vehicleType: trip.vehicle.vehicleType, vehicleNumber: maskVehicleNumber(trip.vehicle.vehicleNumber), rating: trip.driver.rating, departureTime: trip.departureTime, seatsAvailable: trip.availableSeats, goodsCapacityKg: trip.availableGoodsCapacityKg, pickupDistanceKm: fit.pickupDistanceKm, dropDistanceKm: fit.dropDistanceKm, detourKm: fit.detourKm, distanceKm, durationMin: Math.round(trip.estimatedDurationMin * fit.segmentProgress), fare: priced.total, priceBreakdown: priced.breakdown, from: { name: trip.fromLocationName, lat: trip.fromLat, lng: trip.fromLng }, to: { name: trip.toLocationName, lat: trip.toLat, lng: trip.toLng }, isLookingForGoods: trip.isLookingForGoods, safetyBadge: trip.driver.verificationStatus === "APPROVED" });
  }
  matches.sort((a, b) => a.detourKm - b.detourKm || a.fare - b.fare || b.rating - a.rating || +new Date(a.departureTime) - +new Date(b.departureTime));
  return apiSuccess({
    matches,
    recommendedVehicle: recommendedVehicle(parsed.data.weightKg, parsed.data.sizeDescription),
    emptyState: matches.length ? null : "No return vehicle is available for this goods route right now. Try flexible pickup time or nearby drop point.",
  }, "Goods matches loaded");
}
