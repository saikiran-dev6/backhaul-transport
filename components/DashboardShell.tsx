"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";

export function DashboardShell({
  role,
  title,
  copy,
  actions,
  children,
}: {
  role: string;
  title: string;
  copy: string;
  actions?: Array<{ label: string; href: string }>;
  children: ReactNode;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setName(data.user?.fullName || data.user?.name || ""))
      .catch(() => setName(""));
  }, []);

  return (
    <div className="page-shell section-pad">
      <div className="mb-9 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow"><LayoutDashboard className="h-3.5 w-3.5" />{role}</span>
          {name && <p className="mb-2 text-sm font-bold text-eco-700">Hello, {name}</p>}
          <h1 className="display-title">{title}</h1>
          <p className="body-copy mt-3 max-w-2xl">{copy}</p>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Link key={action.href} href={action.href} className={index === 0 ? "btn-primary" : "btn-secondary"}>
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="card !shadow-none">
      <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
      <strong className="mt-2 block text-3xl tracking-tight">{value}</strong>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
