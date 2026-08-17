export type BackhaulRole = "ROUTEMATE" | "LOADMATE" | "CAPTAIN" | "MERCHANT" | "ADMIN";
export type SessionRole = BackhaulRole;

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

export function parseRoleList(raw?: unknown, fallback?: string | null): SessionRole[] {
  try {
    const parsed = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const roles = parsed.filter((role): role is SessionRole => ["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT", "ADMIN"].includes(String(role)));
      if (roles.length) return Array.from(new Set(roles));
    }
  } catch {}
  if (["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT", "ADMIN"].includes(String(fallback))) return [fallback as SessionRole];
  return [];
}

export function roleRequiresSelection(accountRole?: string | null) {
  return accountRole !== "ADMIN";
}
