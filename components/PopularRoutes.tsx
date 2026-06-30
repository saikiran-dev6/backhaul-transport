"use client";

import { ArrowRight, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";

type Popular = { from: string; to: string; activity: number; nextDeparture: string };
export function PopularRoutes() {
  const [routes, setRoutes] = useState<Popular[] | null>(null);
  useEffect(() => { fetch("/api/popular-routes").then((r) => r.json()).then((data) => setRoutes(data.routes || [])).catch(() => setRoutes([])); }, []);
  if (!routes) return <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />;
  if (!routes.length) return <EmptyState title="Popular routes will appear once users start posting trips." copy="No route names are hardcoded here—the list is ranked from live trip and booking records." />;
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{routes.map((route) => <article className="card !shadow-none transition hover:-translate-y-1 hover:shadow-soft" key={`${route.from}-${route.to}`}><div className="mb-4 flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Route className="h-5 w-5" /></span><span className="rounded-full bg-eco-50 px-2 py-1 text-xs font-extrabold text-eco-700">{route.activity} activity</span></div><p className="truncate font-black">{route.from}</p><ArrowRight className="my-2 h-4 w-4 text-slate-400" /><p className="truncate font-black">{route.to}</p><p className="mt-4 text-xs font-semibold text-slate-500">Next: {new Date(route.nextDeparture).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></article>)}</div>;
}
