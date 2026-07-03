import React from "react";
import { Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SelectRoleModal, type SessionRole } from "./SelectRoleModal";

type StackParamList = {
  Home: undefined;
  Matches: undefined;
  Availability: undefined;
  Shipments: undefined;
};

const PassengerStack = createNativeStackNavigator<StackParamList>();
const DriverStack = createNativeStackNavigator<StackParamList>();
const GoodsStack = createNativeStackNavigator<StackParamList>();

function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 8 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>{title}</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: "#475569" }}>{subtitle}</Text>
    </View>
  );
}

function PassengerScreens() {
  return (
    <PassengerStack.Navigator>
      <PassengerStack.Screen name="Home" options={{ title: "RouteMate" }}>
        {() => <PlaceholderScreen title="Passenger dashboard" subtitle="Search routes and subscribe to live Captain availability." />}
      </PassengerStack.Screen>
      <PassengerStack.Screen name="Matches" options={{ title: "Live matches" }}>
        {() => <PlaceholderScreen title="Live passenger matches" subtitle="Use socket.ts to refresh when availability:update arrives." />}
      </PassengerStack.Screen>
    </PassengerStack.Navigator>
  );
}

function DriverScreens() {
  return (
    <DriverStack.Navigator>
      <DriverStack.Screen name="Home" options={{ title: "Backhaul Captain" }}>
        {() => <PlaceholderScreen title="Driver dashboard" subtitle="Toggle looking-for-passengers and stream GPS while status is DRIVING." />}
      </DriverStack.Screen>
      <DriverStack.Screen name="Availability" options={{ title: "Availability" }}>
        {() => <PlaceholderScreen title="Captain availability" subtitle="PATCH /trip/:id/availability emits availability:update to the route room." />}
      </DriverStack.Screen>
    </DriverStack.Navigator>
  );
}

function GoodsScreens() {
  return (
    <GoodsStack.Navigator>
      <GoodsStack.Screen name="Home" options={{ title: "LoadMate" }}>
        {() => <PlaceholderScreen title="Goods dashboard" subtitle="Create shipment requests against the same REST backend." />}
      </GoodsStack.Screen>
      <GoodsStack.Screen name="Shipments" options={{ title: "Shipments" }}>
        {() => <PlaceholderScreen title="Goods shipments" subtitle="Track LoadMate bookings and delivery proof." />}
      </GoodsStack.Screen>
    </GoodsStack.Navigator>
  );
}

export function RoleNavigation({
  sessionRole,
  availableRoles,
  onRoleSelected,
}: {
  sessionRole: SessionRole | null;
  availableRoles: SessionRole[];
  onRoleSelected: (role: SessionRole) => void;
}) {
  if (!sessionRole) {
    return <SelectRoleModal roles={availableRoles} onSelect={onRoleSelected} />;
  }

  return (
    <NavigationContainer>
      {sessionRole === "ROUTEMATE" && <PassengerScreens />}
      {sessionRole === "CAPTAIN" && <DriverScreens />}
      {sessionRole === "LOADMATE" && <GoodsScreens />}
    </NavigationContainer>
  );
}
