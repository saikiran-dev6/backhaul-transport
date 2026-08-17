import React, { useState } from "react";
import { RoleNavigation } from "./src/navigation";
import { AuthScreen } from "./src/screens/AuthScreen";
import type { SessionRole } from "./src/SelectRoleModal";
import type { ApiSession } from "./src/api";

export default function App() {
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(null);
  const [session, setSession] = useState<ApiSession | null>(null);

  if (!session) {
    return (
      <AuthScreen
        onAuthSuccess={({ token, sessionRole: role }) => {
          setSession({ token, sessionRole: role });
          if (role) setSessionRole(role);
        }}
      />
    );
  }

  return (
    <RoleNavigation
      sessionRole={sessionRole}
      session={session}
      availableRoles={["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT"]}
      onRoleSelected={setSessionRole}
    />
  );
}
