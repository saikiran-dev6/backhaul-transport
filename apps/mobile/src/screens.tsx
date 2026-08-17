import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ApiSession } from "./api";
import { streamDriverLocation } from "./location";
import { joinRouteRoom, onAvailabilityUpdate } from "./socket";

function ScreenShell({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>{title}</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: "#475569" }}>{subtitle}</Text>
      {children}
    </View>
  );
}

export function PassengerHome() {
  React.useEffect(() => {
    joinRouteRoom("Hyderabad, Telangana", "Srisailam, Andhra Pradesh");
    return onAvailabilityUpdate((event) => console.log("availability:update", event));
  }, []);
  return <ScreenShell title="Passenger dashboard" subtitle="Search routes and receive Socket.io Captain availability updates." />;
}

export function DriverHome({ session }: { session?: ApiSession | null }) {
  const [streaming, setStreaming] = React.useState(false);
  const startGps = async () => {
    if (!session?.token) return;
    setStreaming(true);
    await streamDriverLocation("DRIVING", (point) => console.log("driver point", point), { token: session.token });
  };
  return (
    <ScreenShell title="Driver dashboard" subtitle="Toggle availability, update trip status, and stream GPS to the shared backend.">
      <Pressable onPress={startGps} style={{ padding: 14, borderRadius: 14, backgroundColor: "#2563eb" }}>
        <Text style={{ color: "white", fontWeight: "800" }}>{streaming ? "GPS streaming..." : "Start GPS stream"}</Text>
      </Pressable>
    </ScreenShell>
  );
}

export function GoodsHome() {
  return <ScreenShell title="Goods dashboard" subtitle="Create LoadMate requests and listen for matching goods vehicle availability." />;
}

export function MerchantHome() {
  return <ScreenShell title="Merchant dashboard" subtitle="Manage repeat business goods routes and shipments." />;
}
