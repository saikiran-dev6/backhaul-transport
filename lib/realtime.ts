export type RealtimeEvent = {
  event: string;
  room: string;
  payload: Record<string, unknown>;
};

export function routeRoom(from: string, to: string) {
  return `route:${from}-${to}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function bookingRoom(bookingId: string) {
  return `booking:${bookingId}`;
}

export function tripRoom(tripId: string) {
  return `trip:${tripId}`;
}

export async function emitRealtime(event: RealtimeEvent) {
  const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return;
  try {
    await fetch(`${apiUrl.replace(/\/$/, "")}/internal/realtime/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.REALTIME_INTERNAL_SECRET || "backhaul-local-dev",
      },
      body: JSON.stringify(event),
      cache: "no-store",
    });
  } catch {
    // Realtime is best-effort. Database writes remain the source of truth.
  }
}
