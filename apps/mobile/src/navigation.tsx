import React from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SelectRoleModal, type SessionRole } from "./SelectRoleModal";
import type { ApiSession } from "./api";
import { PassengerMatchesScreen } from "./screens/PassengerMatchesScreen";
import { CaptainTripScreen } from "./screens/CaptainTripScreen";
import { GoodsShipmentScreen } from "./screens/GoodsShipmentScreen";
import { MerchantHome } from "./screens";

type StackParamList = {
  Home: undefined;
  Matches: undefined;
  Availability: undefined;
  Shipments: undefined;
  Business: undefined;
};

const PassengerStack = createNativeStackNavigator<StackParamList>();
const DriverStack = createNativeStackNavigator<StackParamList>();
const GoodsStack = createNativeStackNavigator<StackParamList>();
const MerchantStack = createNativeStackNavigator<StackParamList>();

function PassengerScreens({ session }: { session?: ApiSession | null }) {
  return (
    <PassengerStack.Navigator>
      <PassengerStack.Screen name="Home" options={{ title: "RouteMate Passenger" }}>
        {() => <PassengerMatchesScreen session={session} />}
      </PassengerStack.Screen>
    </PassengerStack.Navigator>
  );
}

function DriverScreens({ session }: { session?: ApiSession | null }) {
  return (
    <DriverStack.Navigator>
      <DriverStack.Screen name="Home" options={{ title: "Backhaul Captain" }}>
        {() => <CaptainTripScreen session={session} />}
      </DriverStack.Screen>
    </DriverStack.Navigator>
  );
}

function GoodsScreens({ session }: { session?: ApiSession | null }) {
  return (
    <GoodsStack.Navigator>
      <GoodsStack.Screen name="Home" options={{ title: "LoadMate Logistics" }}>
        {() => <GoodsShipmentScreen session={session} />}
      </GoodsStack.Screen>
    </GoodsStack.Navigator>
  );
}

function MerchantScreens() {
  return (
    <MerchantStack.Navigator>
      <MerchantStack.Screen name="Business" options={{ title: "Merchant Portal" }}>
        {() => <MerchantHome />}
      </MerchantStack.Screen>
    </MerchantStack.Navigator>
  );
}

export function RoleNavigation({
  sessionRole,
  session,
  availableRoles,
  onRoleSelected,
}: {
  sessionRole: SessionRole | null;
  session?: ApiSession | null;
  availableRoles: SessionRole[];
  onRoleSelected: (role: SessionRole) => void;
}) {
  if (!sessionRole) {
    return <SelectRoleModal roles={availableRoles} onSelect={onRoleSelected} />;
  }

  return (
    <NavigationContainer>
      {sessionRole === "ROUTEMATE" && <PassengerScreens session={session} />}
      {sessionRole === "CAPTAIN" && <DriverScreens session={session} />}
      {sessionRole === "LOADMATE" && <GoodsScreens session={session} />}
      {sessionRole === "MERCHANT" && <MerchantScreens />}
    </NavigationContainer>
  );
}
