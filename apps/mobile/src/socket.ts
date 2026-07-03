import { io } from "socket.io-client";

export type AvailabilityUpdate =
  | {
      type: "trip";
      tripId: string;
      isLookingForPassengers: boolean;
      from: string;
      to: string;
    }
  | {
      type: "passenger";
      passengerBookingId: string;
      isLookingForRide: boolean;
      from: string;
      to: string;
    };

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export const socket = io(API_URL, { autoConnect: false });

export function joinRouteRoom(from: string, to: string) {
  if (!socket.connected) socket.connect();
  socket.emit("route:join", { from, to });
}

export function onAvailabilityUpdate(handler: (event: AvailabilityUpdate) => void) {
  socket.on("availability:update", handler);
  return () => socket.off("availability:update", handler);
}
