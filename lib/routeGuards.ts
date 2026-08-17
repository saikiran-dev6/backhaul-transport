import type { BackhaulRole } from "@/lib/roles";

export type RoleRule = { prefix: string; roles: BackhaulRole[] };

export const roleRules: RoleRule[] = [
  { prefix: "/dashboard/passenger", roles: ["ROUTEMATE"] },
  { prefix: "/dashboard/goods", roles: ["LOADMATE"] },
  { prefix: "/dashboard/merchant", roles: ["MERCHANT"] },
  { prefix: "/dashboard/driver", roles: ["CAPTAIN"] },
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/book/passenger", roles: ["ROUTEMATE"] },
  { prefix: "/book/goods", roles: ["LOADMATE", "MERCHANT"] },
  { prefix: "/post-trip", roles: ["CAPTAIN"] },
  { prefix: "/verification", roles: ["CAPTAIN"] },
  { prefix: "/history", roles: ["ROUTEMATE", "LOADMATE", "MERCHANT"] },
  { prefix: "/rating", roles: ["ROUTEMATE"] },
  { prefix: "/tracking/passenger", roles: ["ROUTEMATE"] },
  { prefix: "/tracking/goods", roles: ["LOADMATE", "MERCHANT"] },
  { prefix: "/tracking", roles: ["ROUTEMATE", "LOADMATE", "MERCHANT", "CAPTAIN", "ADMIN"] },
];

export function rolesForPath(pathname: string) {
  return roleRules.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))?.roles;
}
