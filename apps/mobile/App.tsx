import React, { useState } from "react";
import { RoleNavigation } from "./src/navigation";
import type { SessionRole } from "./src/SelectRoleModal";

export default function App() {
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(null);

  return (
    <RoleNavigation
      sessionRole={sessionRole}
      availableRoles={["ROUTEMATE", "LOADMATE", "CAPTAIN"]}
      onRoleSelected={setSessionRole}
    />
  );
}
