export type BackhaulRole = "ROUTEMATE" | "LOADMATE" | "CAPTAIN" | "MERCHANT" | "ADMIN";
export type SessionRole = "ROUTEMATE" | "LOADMATE" | "CAPTAIN" | "ADMIN";

export const roleLabels: Record<BackhaulRole, string> = {
  ROUTEMATE: "RouteMate",
  LOADMATE: "LoadMate",
  CAPTAIN: "Backhaul Captain",
  MERCHANT: "Merchant",
  ADMIN: "Control Hub",
};

export const roleDashboards: Record<BackhaulRole, string> = {
  ROUTEMATE: "/dashboard/passenger",
  LOADMATE: "/dashboard/goods",
  CAPTAIN: "/dashboard/driver",
  MERCHANT: "/dashboard/merchant",
  ADMIN: "/dashboard/admin",
};

export function dashboardForRole(role?: string | null) {
  return roleDashboards[role as BackhaulRole] || "/login";
}

export function isBackhaulRole(role?: string | null): role is BackhaulRole {
  return Boolean(role && role in roleDashboards);
}

export function parseRoleList(raw?: string | null, fallback?: string | null): SessionRole[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const roles = parsed.filter((role): role is SessionRole => ["ROUTEMATE", "LOADMATE", "CAPTAIN", "ADMIN"].includes(String(role)));
      if (roles.length) return Array.from(new Set(roles));
    }
  } catch {}
  if (fallback === "MERCHANT") return ["LOADMATE"];
  if (["ROUTEMATE", "LOADMATE", "CAPTAIN", "ADMIN"].includes(String(fallback))) return [fallback as SessionRole];
  return [];
}

export function roleRequiresSelection(accountRole?: string | null) {
  return accountRole !== "ADMIN";
}
