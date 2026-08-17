import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { createGoodsRequest, uploadGoodsProof, ApiSession } from "../api";

export function GoodsShipmentScreen({ session }: { session?: ApiSession | null }) {
  const [pickup, setPickup] = useState("Hyderabad Industrial Estate");
  const [dropoff, setDropoff] = useState("Vijayawada Market Yard");
  const [weight, setWeight] = useState("450");
  const [itemType, setItemType] = useState("Agricultural Produce");
  const [coldStorage, setColdStorage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState<{ id: string; status: string } | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [proofUrl, setProofUrl] = useState("https://backhaul.internal/proofs/delivery_001.jpg");
  const [message, setMessage] = useState<string | null>(null);

  const handleCreateRequest = async () => {
    if (!session?.token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await createGoodsRequest(session.token, {
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        weightKg: parseFloat(weight) || 450,
        itemType,
        requiresColdStorage: coldStorage,
      });
      setActiveRequest(res.request);
      setMessage(`Goods Request #${res.request.id.slice(0, 8)} Created!`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!session?.token || !bookingId) return;
    setLoading(true);
    setMessage(null);
    try {
      await uploadGoodsProof(session.token, { bookingId, proofUrl });
      setMessage("Delivery Proof Photo Uploaded Successfully!");
    } catch (err: any) {
      setMessage(`Upload Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LoadMate Goods Logistics</Text>

      {message && <Text style={styles.messageText}>{message}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Post Commercial Goods Shipment</Text>
        <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Pickup Location" />
        <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} placeholder="Dropoff Location" />
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} value={weight} onChangeText={setWeight} placeholder="Weight (kg)" keyboardType="number-pad" />
          <TextInput style={[styles.input, { flex: 1 }]} value={itemType} onChangeText={setItemType} placeholder="Item Category" />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Requires Refrigerated / Cold Storage:</Text>
          <Switch value={coldStorage} onValueChange={setColdStorage} />
        </View>
        <Pressable style={styles.button} onPress={handleCreateRequest} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Find Goods Vehicle Match</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Upload Delivery Proof Photo</Text>
        <TextInput style={styles.input} value={bookingId} onChangeText={setBookingId} placeholder="Goods Booking ID" />
        <TextInput style={styles.input} value={proofUrl} onChangeText={setProofUrl} placeholder="Image URL / Camera Photo Path" />
        <Pressable style={[styles.button, { backgroundColor: "#16a34a" }]} onPress={handleUploadProof} disabled={loading}>
          <Text style={styles.buttonText}>Upload Delivery Proof</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc", gap: 16 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  card: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: "#cbd5e1" },
  cardHeader: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#334155", flex: 1 },
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  messageText: { color: "#2563eb", fontWeight: "700", textAlign: "center" },
});
