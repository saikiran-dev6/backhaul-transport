export type ApiSession = {
  token: string;
  sessionRole?: "ROUTEMATE" | "LOADMATE" | "CAPTAIN" | "MERCHANT" | "ADMIN";
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data as T;
}

export function login(identifier: string, password: string) {
  return apiRequest<{ token: string; user: { availableRoles: string[] }; requiresRoleSelection: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function selectSessionRole(token: string, role: string) {
  return apiRequest<{ token: string; sessionRole: ApiSession["sessionRole"] }>("/auth/session-role", {
    method: "POST",
    token,
    body: JSON.stringify({ role }),
  });
}

export function verifyOtp(identifier: string, otp: string) {
  return apiRequest<{ token: string; sessionRole?: ApiSession["sessionRole"] }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ identifier, otp }),
  });
}

export function updateDriverLocation(token: string, body: { tripId?: string; lat: number; lng: number; status: "DRIVING" | "IDLE" | "LOOKING" | "OFFLINE" }) {
  return apiRequest("/driver/location", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function searchPassengerMatches(token: string, body: { origin: string; destination: string; seats?: number }) {
  return apiRequest<{ matches: Array<{ id: string; driverName: string; vehicleModel: string; availableSeats: number; pricePerSeat: number; origin: string; destination: string }> }>("/matches/passenger", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function createPassengerBooking(token: string, body: { tripId: string; seatsRequested?: number }) {
  return apiRequest<{ booking: { id: string; pickupOtp: string; bookingStatus: string; fare: number } }>("/bookings/passenger", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function createCaptainTrip(token: string, body: { origin: string; destination: string; totalSeats: number; pricePerSeat: number; vehicleId: string }) {
  return apiRequest<{ trip: { id: string; tripStatus: string } }>("/trips", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function toggleTripAvailability(token: string, tripId: string, isLookingForPassengers: boolean) {
  return apiRequest<{ trip: { id: string; isLookingForPassengers: boolean } }>(`/trips/${tripId}/availability`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ isLookingForPassengers }),
  });
}

export function verifyPassengerOtp(token: string, body: { bookingId: string; otp: string }) {
  return apiRequest<{ success: boolean; message: string }>("/bookings/passenger/verify-otp", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function createGoodsRequest(token: string, body: { pickupLocation: string; dropoffLocation: string; weightKg: number; itemType: string; requiresColdStorage?: boolean }) {
  return apiRequest<{ request: { id: string; status: string } }>("/matches/goods", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function uploadGoodsProof(token: string, body: { bookingId: string; proofUrl: string }) {
  return apiRequest<{ booking: { id: string; proofUrl: string } }>("/bookings/goods/proof", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export function registerPushToken(token: string, pushToken: string) {
  return apiRequest<{ success: boolean; message: string }>("/user/push-token", {
    method: "POST",
    token,
    body: JSON.stringify({ pushToken }),
  });
}

export function getReceipt(token: string, paymentId: string) {
  return apiRequest<{ receipt: { id: string; amount: number; method: string; date: string } }>(`/payments/receipt/${paymentId}`, {
    method: "GET",
    token,
  });
}
