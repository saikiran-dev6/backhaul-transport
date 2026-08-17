export type PassengerBookingStatus = "CONFIRMED" | "PICKED_UP" | "COMPLETED" | "CANCELLED";
export type GoodsDeliveryStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED" | "COMPLETED" | "CANCELLED";
export type TripStatus = "ACTIVE" | "STARTED" | "DRIVING" | "PICKUP_REACHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const PASSENGER_TRANSITIONS: Record<PassengerBookingStatus, PassengerBookingStatus[]> = {
  CONFIRMED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const GOODS_DELIVERY_TRANSITIONS: Record<GoodsDeliveryStatus, GoodsDeliveryStatus[]> = {
  PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "COMPLETED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  ACTIVE: ["STARTED", "DRIVING", "PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  STARTED: ["DRIVING", "PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  DRIVING: ["PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  PICKUP_REACHED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionPassengerBooking(current: string, next: string): boolean {
  const allowed = PASSENGER_TRANSITIONS[current as PassengerBookingStatus];
  if (!allowed) return false;
  return allowed.includes(next as PassengerBookingStatus);
}

export function validatePassengerBookingTransition(current: string, next: string): void {
  if (current === next) return;
  if (!canTransitionPassengerBooking(current, next)) {
    throw new Error(`Illegal passenger booking transition from ${current} to ${next}`);
  }
}

export function canTransitionGoodsDelivery(current: string, next: string): boolean {
  const allowed = GOODS_DELIVERY_TRANSITIONS[current as GoodsDeliveryStatus];
  if (!allowed) return false;
  return allowed.includes(next as GoodsDeliveryStatus);
}

export function validateGoodsDeliveryTransition(current: string, next: string): void {
  if (current === next) return;
  if (!canTransitionGoodsDelivery(current, next)) {
    throw new Error(`Illegal goods delivery status transition from ${current} to ${next}`);
  }
}

export function canTransitionTrip(current: string, next: string): boolean {
  const allowed = TRIP_TRANSITIONS[current as TripStatus];
  if (!allowed) return false;
  return allowed.includes(next as TripStatus);
}

export function validateTripTransition(current: string, next: string): void {
  if (current === next) return;
  if (!canTransitionTrip(current, next)) {
    throw new Error(`Illegal trip status transition from ${current} to ${next}`);
  }
}
