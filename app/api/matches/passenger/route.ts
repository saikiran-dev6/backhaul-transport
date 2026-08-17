import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requestUser } from "@/lib/auth";
import { passengerEligible } from "@/lib/matching";
import { maskVehicleNumber } from "@/lib/geo";
import { passengerPrice } from "@/lib/pricing";
import { passengerMatchSchema } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const auth = await requestUser(request);
  if (!auth) return apiError("Please login to access Backhaul services.", 401);
  if (auth.role !== "ROUTEMATE") return apiError("You do not have permission to access this module.", 403);
  const parsed = passengerMatchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Invalid search", 400, parsed.error.issues);
  if (!parsed.data.isLookingForRide) return apiSuccess({ matches: [], reason: "Passenger is not currently looking for a ride" }, "Passenger search is paused");
  const selected = new Date(parsed.data.departureTime);
  const trips = await db.returnTrip.findMany({
    where: {
      status: "ACTIVE",
      isLookingForPassengers: true,
      availableSeats: { gte: parsed.data.seats },
      departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 36 * 3600000) },
      driver: { is: { verificationStatus: "APPROVED" } },
      vehicle: { is: { verificationStatus: "APPROVED", permitType: { in: ["PASSENGER", "BOTH"] } } },
    },
    include: { vehicle: true, driver: { include: { user: true } } },
  });
  const rules = await db.pricingRule.findMany();
  const fallback = rules.find((rule) => rule.vehicleType === "DEFAULT");
  const matches = [];
  for (const trip of trips) {
    const fit = passengerEligible(trip, parsed.data.pickup, parsed.data.drop, parsed.data.seats);
    if (!fit.eligible) continue;
    const rule = rules.find((item) => item.vehicleType === trip.vehicle.vehicleType) || fallback;
    if (!rule) continue;
    const distanceKm = Math.max(1, trip.routeDistanceKm * fit.segmentProgress);
    const priced = passengerPrice({ distanceKm, detourKm: fit.detourKm, seatsRequested: parsed.data.seats, tripAvailableSeats: trip.availableSeats, vehicle: trip.vehicle, rule });
    matches.push({ tripId: trip.id, driverName: trip.driver.user.fullName, vehicleType: trip.vehicle.vehicleType, vehicleNumber: maskVehicleNumber(trip.vehicle.vehicleNumber), rating: trip.driver.rating, departureTime: trip.departureTime, seatsAvailable: trip.availableSeats, goodsCapacityKg: trip.availableGoodsCapacityKg, pickupDistanceKm: fit.pickupDistanceKm, dropDistanceKm: fit.dropDistanceKm, detourKm: fit.detourKm, distanceKm, durationMin: Math.round(trip.estimatedDurationMin * fit.segmentProgress), fare: priced.total, priceBreakdown: priced.breakdown, from: { name: trip.fromLocationName, lat: trip.fromLat, lng: trip.fromLng }, to: { name: trip.toLocationName, lat: trip.toLat, lng: trip.toLng }, isLookingForPassengers: trip.isLookingForPassengers, safetyBadge: trip.driver.verificationStatus === "APPROVED" });
  }
  matches.sort((a, b) => a.detourKm - b.detourKm || a.fare - b.fare || b.rating - a.rating || +new Date(a.departureTime) - +new Date(b.departureTime));
  return apiSuccess({
    matches,
    emptyState: matches.length ? null : "No Backhaul Captains are available on this route right now. Try changing time, nearby pickup, or drop location.",
  }, "Passenger matches loaded");
}
