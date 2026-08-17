import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { searchPassengerMatches, createPassengerBooking, ApiSession } from "../api";
import { joinRouteRoom, onAvailabilityUpdate } from "../socket";

export function PassengerMatchesScreen({ session }: { session?: ApiSession | null }) {
  const [origin, setOrigin] = useState("Hyderabad, Telangana");
  const [destination, setDestination] = useState("Srisailam, Andhra Pradesh");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Array<{ id: string; driverName: string; vehicleModel: string; availableSeats: number; pricePerSeat: number }>>([]);
  const [activeBooking, setActiveBooking] = useState<{ id: string; pickupOtp: string; bookingStatus: string; fare: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    joinRouteRoom(origin, destination);
    return onAvailabilityUpdate(() => {
      if (session?.token) void handleSearch();
    });
  }, [origin, destination]);

  const handleSearch = async () => {
    if (!session?.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchPassengerMatches(session.token, { origin, destination });
      setMatches(res.matches || []);
    } catch (err: any) {
      setError(err.message || "Failed to search matches");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (tripId: string) => {
    if (!session?.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createPassengerBooking(session.token, { tripId, seatsRequested: 1 });
      setActiveBooking(res.booking);
    } catch (err: any) {
      setError(err.message || "Booking creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RouteMate Passenger Search</Text>
      <Text style={styles.subtitle}>Find verified Captains returning along your route</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {activeBooking ? (
        <View style={styles.cardHighlight}>
          <Text style={styles.cardTitle}>Ride Booked Successfully!</Text>
          <Text style={styles.otpLabel}>Pickup OTP (Show to Captain):</Text>
          <Text style={styles.otpCode}>{activeBooking.pickupOtp || "123456"}</Text>
          <Text style={styles.cardText}>Fare: ₹{activeBooking.fare}</Text>
          <Text style={styles.cardSubtext}>Payment is due only after your ride is completed.</Text>
        </View>
      ) : (
        <>
          <View style={styles.searchBox}>
            <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="Origin" />
            <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Destination" />
            <Pressable style={styles.button} onPress={handleSearch} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Search Matches</Text>}
            </Pressable>
          </View>

          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.matchCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{item.driverName || "Verified Captain"}</Text>
                  <Text style={styles.vehicleInfo}>{item.vehicleModel || "Commercial Vehicle"}</Text>
                  <Text style={styles.seatInfo}>{item.availableSeats} seats available</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Text style={styles.price}>₹{item.pricePerSeat}</Text>
                  <Pressable style={styles.bookButton} onPress={() => handleBook(item.id)}>
                    <Text style={styles.bookButtonText}>Book</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !loading ? <Text style={styles.emptyText}>No available Captains on this route yet. Pull to refresh.</Text> : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  searchBox: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, gap: 10, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, fontSize: 15 },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  matchCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 14, flexDirection: "row", marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  driverName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  vehicleInfo: { fontSize: 14, color: "#475569", marginTop: 2 },
  seatInfo: { fontSize: 13, color: "#16a34a", fontWeight: "700", marginTop: 4 },
  price: { fontSize: 18, fontWeight: "900", color: "#2563eb" },
  bookButton: { backgroundColor: "#16a34a", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  bookButtonText: { color: "#ffffff", fontWeight: "800" },
  cardHighlight: { backgroundColor: "#eff6ff", padding: 24, borderRadius: 18, borderWidth: 2, borderColor: "#3b82f6", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#1e40af" },
  otpLabel: { fontSize: 14, fontWeight: "600", color: "#475569" },
  otpCode: { fontSize: 36, fontWeight: "900", color: "#2563eb", letterSpacing: 4 },
  cardText: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  cardSubtext: { fontSize: 12, color: "#64748b", textAlign: "center" },
  errorText: { color: "#dc2626", marginBottom: 12, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
});
