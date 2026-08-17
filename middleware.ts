import { NextRequest, NextResponse } from "next/server";
import { readToken } from "@/lib/auth";
import { dashboardForRole, type BackhaulRole } from "@/lib/roles";
import { rolesForPath } from "@/lib/routeGuards";
import { getRequestId, withCorrelationHeaders } from "@/lib/correlation";

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function redirectToLogin(request: NextRequest, requestId: string) {
  const url = request.nextUrl.clone();
  const login = new URL("/login", url.origin);
  login.searchParams.set("notice", "login_required");
  login.searchParams.set("next", `${url.pathname}${url.search}`);
  return applySecurityHeaders(withCorrelationHeaders(NextResponse.redirect(login), requestId));
}

function redirectToOwnDashboard(request: NextRequest, role: string, requestId: string) {
  const target = new URL(dashboardForRole(role), request.nextUrl.origin);
  target.searchParams.set("notice", "permission_denied");
  return applySecurityHeaders(withCorrelationHeaders(NextResponse.redirect(target), requestId));
}

function redirectToRoleSelection(request: NextRequest, requestId: string) {
  const selectRole = new URL("/select-role", request.nextUrl.origin);
  selectRole.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return applySecurityHeaders(withCorrelationHeaders(NextResponse.redirect(selectRole), requestId));
}

export async function middleware(request: NextRequest) {
  const requestId = getRequestId(request);
  const { pathname } = request.nextUrl;
  const auth = await readToken(request.cookies.get("backhaul_token")?.value);

  if (pathname === "/select-role") {
    if (!auth) return redirectToLogin(request, requestId);
    return applySecurityHeaders(withCorrelationHeaders(NextResponse.next(), requestId));
  }

  if (pathname === "/dashboard") {
    if (!auth) return redirectToLogin(request, requestId);
    if (!auth.sr && auth.accountRole !== "ADMIN") return redirectToRoleSelection(request, requestId);
    return applySecurityHeaders(withCorrelationHeaders(NextResponse.redirect(new URL(dashboardForRole(auth.role), request.nextUrl.origin)), requestId));
  }

  const roles = rolesForPath(pathname);
  if (!roles) return applySecurityHeaders(withCorrelationHeaders(NextResponse.next(), requestId));
  if (!auth) return redirectToLogin(request, requestId);
  if (!auth.sr && auth.accountRole !== "ADMIN") return redirectToRoleSelection(request, requestId);
  if (!roles.includes(auth.role as BackhaulRole)) return redirectToOwnDashboard(request, auth.role, requestId);

  return applySecurityHeaders(withCorrelationHeaders(NextResponse.next(), requestId));
}

export const config = {
  matcher: ["/select-role", "/dashboard/:path*", "/book/:path*", "/post-trip/:path*", "/verification/:path*", "/history/:path*", "/rating/:path*", "/tracking/:path*"],
};
