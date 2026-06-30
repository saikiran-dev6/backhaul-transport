export type LocationPoint = { name: string; lat: number; lng: number };

export type RouteMatch = {
  tripId: string;
  driverName: string;
  vehicleType: string;
  vehicleNumber: string;
  rating: number;
  departureTime: string;
  seatsAvailable: number;
  goodsCapacityKg: number;
  pickupDistanceKm: number;
  dropDistanceKm: number;
  detourKm: number;
  distanceKm: number;
  durationMin: number;
  fare: number;
  priceBreakdown: Record<string, number>;
  from: LocationPoint;
  to: LocationPoint;
  isLookingForPassengers?: boolean;
};
