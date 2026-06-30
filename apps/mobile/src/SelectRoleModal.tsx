import React from "react";
import { Pressable, Text, View } from "react-native";

export type SessionRole = "ROUTEMATE" | "LOADMATE" | "CAPTAIN";

const labels: Record<SessionRole, string> = {
  ROUTEMATE: "Passenger (RouteMate)",
  LOADMATE: "Goods Sender (LoadMate)",
  CAPTAIN: "Driver (Backhaul Captain)",
};

export function SelectRoleModal({ roles, onSelect }: { roles: SessionRole[]; onSelect: (role: SessionRole) => void }) {
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Choose your Backhaul role</Text>
      {roles.map((role) => (
        <Pressable key={role} onPress={() => onSelect(role)} style={{ padding: 16, borderRadius: 16, backgroundColor: "#eef7ff" }}>
          <Text style={{ fontWeight: "800" }}>{labels[role]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
