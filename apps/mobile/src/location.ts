import * as Location from "expo-location";
import { updateDriverLocation } from "./api";

export type DriverStatus = "IDLE" | "LOOKING" | "DRIVING" | "OFFLINE";

export async function streamDriverLocation(
  status: DriverStatus,
  onPoint: (point: { latitude: number; longitude: number }) => void,
  options?: { token?: string; tripId?: string },
) {
  if (status !== "DRIVING") {
    return { remove() {} };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Location permission denied");
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
    (position) => {
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      onPoint(point);
      if (options?.token) {
        void updateDriverLocation(options.token, { tripId: options.tripId, lat: point.latitude, lng: point.longitude, status: "DRIVING" });
      }
    },
  );
}
