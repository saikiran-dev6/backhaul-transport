import { NextRequest, NextResponse } from "next/server";
import { readToken } from "@/lib/auth";
import { dashboardForRole, type BackhaulRole } from "@/lib/roles";

type Rule = { prefix: string; roles: BackhaulRole[] };

const roleRules: Rule[] = [
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

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  const login = new URL("/login", url.origin);
  login.searchParams.set("notice", "login_required");
  login.searchParams.set("next", `${url.pathname}${url.search}`);
  return NextResponse.redirect(login);
}

function redirectToOwnDashboard(request: NextRequest, role: string) {
  const target = new URL(dashboardForRole(role), request.nextUrl.origin);
  target.searchParams.set("notice", "permission_denied");
  return NextResponse.redirect(target);
}

function redirectToRoleSelection(request: NextRequest) {
  const selectRole = new URL("/select-role", request.nextUrl.origin);
  selectRole.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(selectRole);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = await readToken(request.cookies.get("backhaul_token")?.value);

  if (pathname === "/select-role") {
    if (!auth) return redirectToLogin(request);
    return NextResponse.next();
  }

  if (pathname === "/dashboard") {
    if (!auth) return redirectToLogin(request);
    if (!auth.sr && auth.accountRole !== "ADMIN") return redirectToRoleSelection(request);
    return NextResponse.redirect(new URL(dashboardForRole(auth.role), request.nextUrl.origin));
  }

  const rule = roleRules.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (!rule) return NextResponse.next();
  if (!auth) return redirectToLogin(request);
  if (!auth.sr && auth.accountRole !== "ADMIN") return redirectToRoleSelection(request);
  if (!rule.roles.includes(auth.role as BackhaulRole)) return redirectToOwnDashboard(request, auth.role);
  return NextResponse.next();
}

export const config = {
  matcher: ["/select-role", "/dashboard/:path*", "/book/:path*", "/post-trip/:path*", "/verification/:path*", "/history/:path*", "/rating/:path*", "/tracking/:path*"],
};
