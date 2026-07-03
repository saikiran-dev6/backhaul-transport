import * as Location from "expo-location";

export type DriverStatus = "IDLE" | "LOOKING" | "DRIVING" | "OFFLINE";

export async function streamDriverLocation(
  status: DriverStatus,
  onPoint: (point: { latitude: number; longitude: number }) => void,
) {
  if (status !== "DRIVING") {
    return { remove() {} };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Location permission denied");
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
    (position) => onPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
  );
}
