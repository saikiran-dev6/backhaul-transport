"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SessionRole } from "@/lib/roles";

export function RequireRole({ roles, children }: { roles: SessionRole[]; children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        const sessionRole = data.user?.sessionRole || data.user?.role;
        if (!sessionRole) {
          router.replace("/select-role");
          return;
        }
        if (!roles.includes(sessionRole)) {
          router.replace("/dashboard?notice=permission_denied");
          return;
        }
        setAllowed(true);
      })
      .catch(() => router.replace("/login?notice=login_required"));
  }, [roles, router]);

  if (!allowed) {
    return (
      <div className="page-shell section-pad">
        <div className="card animate-pulse">Checking role access...</div>
      </div>
    );
  }

  return <>{children}</>;
}
