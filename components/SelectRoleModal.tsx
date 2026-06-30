"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, ShieldCheck, Truck, Users, type LucideIcon } from "lucide-react";
import { dashboardForRole, roleLabels, type SessionRole } from "@/lib/roles";

const roleCards: Record<SessionRole, { title: string; copy: string; icon: LucideIcon }> = {
  ROUTEMATE: { title: "Passenger (RouteMate)", copy: "Book return seats and track your passenger trips.", icon: Users },
  CAPTAIN: { title: "Driver (Backhaul Captain)", copy: "Post return trips, toggle passenger availability and manage earnings.", icon: Truck },
  LOADMATE: { title: "Goods Sender (LoadMate)", copy: "Send goods, use pickup/delivery OTPs and track proof of delivery.", icon: Boxes },
  ADMIN: { title: "Admin (Control Hub)", copy: "Manage users, verification, pricing and reports.", icon: ShieldCheck },
};

export function SelectRoleModal() {
  const router = useRouter();
  const [roles, setRoles] = useState<SessionRole[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login?notice=login_required");
          return;
        }
        setRoles(data.user.availableRoles || []);
        setName(data.user.fullName || "");
      })
      .catch(() => router.replace("/login?notice=login_required"));
  }, [router]);

  const choose = async (role: SessionRole) => {
    setBusy(role);
    setError("");
    const response = await fetch("/api/auth/session-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(data.error || "Could not select role");
      return;
    }
    router.replace(dashboardForRole(data.sessionRole));
    router.refresh();
  };

  return (
    <section className="bg-gradient-to-br from-brand-50 via-white to-eco-50 py-16 sm:py-24">
      <div className="page-shell">
        <div className="card mx-auto max-w-3xl">
          <div className="mb-7 text-center">
            <span className="eyebrow">Choose session role</span>
            <h1 className="text-3xl font-black sm:text-4xl">How are you using Backhaul now?</h1>
            <p className="mt-3 text-slate-600">{name ? `Welcome, ${name}. ` : ""}Your dashboard and modules will match this selected session role.</p>
          </div>
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <div className="grid gap-4 md:grid-cols-3">
            {roles.map((role) => {
              const card = roleCards[role];
              const Icon = card.icon;
              return (
                <button
                  key={role}
                  onClick={() => choose(role)}
                  disabled={Boolean(busy)}
                  className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-1 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Icon /></span>
                  <strong className="block text-lg">{card.title || roleLabels[role]}</strong>
                  <span className="mt-2 block text-sm leading-6 text-slate-500">{card.copy}</span>
                  <span className="mt-5 inline-flex text-sm font-black text-brand-700">{busy === role ? "Selecting…" : "Continue"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
