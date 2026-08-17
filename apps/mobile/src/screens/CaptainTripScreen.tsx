import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { createCaptainTrip, toggleTripAvailability, verifyPassengerOtp, ApiSession } from "../api";
import { streamDriverLocation } from "../location";

export function CaptainTripScreen({ session }: { session?: ApiSession | null }) {
  const [origin, setOrigin] = useState("Hyderabad, Telangana");
  const [destination, setDestination] = useState("Srisailam, Andhra Pradesh");
  const [seats, setSeats] = useState("4");
  const [fare, setFare] = useState("350");
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(true);
  const [isStreamingGps, setIsStreamingGps] = useState(false);
  const [passengerBookingId, setPassengerBookingId] = useState("");
  const [pickupOtp, setPickupOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePostTrip = async () => {
    if (!session?.token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await createCaptainTrip(session.token, {
        origin,
        destination,
        totalSeats: parseInt(seats, 10) || 4,
        pricePerSeat: parseFloat(fare) || 350,
        vehicleId: "v_12345",
      });
      setActiveTripId(res.trip.id);
      setMessage(`Trip #${res.trip.id.slice(0, 8)} published successfully!`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (value: boolean) => {
    setIsLooking(value);
    if (session?.token && activeTripId) {
      try {
        await toggleTripAvailability(session.token, activeTripId, value);
      } catch (err: any) {
        console.warn("Toggle error", err);
      }
    }
  };

  const handleStartGps = async () => {
    if (!session?.token) return;
    setIsStreamingGps(true);
    await streamDriverLocation(
      "DRIVING",
      (point) => console.log("GPS stream point:", point),
      { token: session.token, tripId: activeTripId || undefined }
    );
  };

  const handleVerifyOtp = async () => {
    if (!session?.token || !passengerBookingId || !pickupOtp) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await verifyPassengerOtp(session.token, { bookingId: passengerBookingId, otp: pickupOtp });
      setMessage(res.message || "Passenger Pickup Verified!");
      setPickupOtp("");
    } catch (err: any) {
      setMessage(`OTP Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backhaul Captain Control</Text>

      {message && <Text style={styles.messageText}>{message}</Text>}

      {!activeTripId ? (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Post Returning Trip</Text>
          <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="Origin" />
          <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Destination" />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} value={seats} onChangeText={setSeats} placeholder="Seats" keyboardType="number-pad" />
            <TextInput style={[styles.input, { flex: 1 }]} value={fare} onChangeText={setFare} placeholder="Fare ₹" keyboardType="number-pad" />
          </View>
          <Pressable style={styles.button} onPress={handlePostTrip} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Publish Trip</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardActive}>
          <Text style={styles.activeHeader}>Active Trip Active</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Looking for Passengers:</Text>
            <Switch value={isLooking} onValueChange={handleToggleAvailability} />
          </View>
          <Pressable style={styles.gpsButton} onPress={handleStartGps}>
            <Text style={styles.buttonText}>{isStreamingGps ? "GPS Streaming Active..." : "Start Live GPS Stream"}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Verify Passenger Pickup OTP</Text>
        <TextInput style={styles.input} value={passengerBookingId} onChangeText={setPassengerBookingId} placeholder="Passenger Booking ID" />
        <TextInput style={styles.input} value={pickupOtp} onChangeText={setPickupOtp} placeholder="6-digit Pickup OTP" keyboardType="number-pad" />
        <Pressable style={[styles.button, { backgroundColor: "#16a34a" }]} onPress={handleVerifyOtp} disabled={loading}>
          <Text style={styles.buttonText}>Verify Pickup OTP</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc", gap: 16 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  card: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: "#cbd5e1" },
  cardActive: { backgroundColor: "#f0fdf4", padding: 16, borderRadius: 16, gap: 12, borderWidth: 2, borderColor: "#16a34a" },
  cardHeader: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  activeHeader: { fontSize: 18, fontWeight: "900", color: "#15803d" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 15, fontWeight: "700", color: "#334155" },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  gpsButton: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  messageText: { color: "#2563eb", fontWeight: "700", textAlign: "center" },
});
