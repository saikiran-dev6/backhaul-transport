"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  BusFront,
  CheckCircle2,
  Coins,
  Fuel,
  Leaf,
  MapPinned,
  PackageCheck,
  Recycle,
  Route,
  ShieldCheck,
  Smartphone,
  Star,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/Providers";
import { LandingMapPreview } from "@/components/LandingMapPreview";
import { PopularRoutes } from "@/components/PopularRoutes";

export function LandingPage() {
  const { t } = useLanguage();
  const loginHref = "/login?notice=service_login";

  const services = [
    { icon: Users, title: "RouteMate: Book Return Seat", copy: "Passengers find verified empty return seats on the same or nearby route.", roleHref: "/register?role=ROUTEMATE", color: "bg-brand-50 text-brand-700" },
    { icon: Boxes, title: "LoadMate: Send Goods", copy: "Goods senders place parcels, boxes and local loads into unused return capacity.", roleHref: "/register?role=LOADMATE", color: "bg-eco-50 text-eco-700" },
    { icon: Truck, title: "Backhaul Captain: Post Return Trip", copy: "Verified drivers and vehicle owners publish dynamic return trips after approval.", roleHref: "/register?role=CAPTAIN", color: "bg-amber-50 text-amber-700" },
    { icon: Building2, title: "Merchant: Business Goods Movement", copy: "Businesses manage repeat shipments, booking history and bulk goods movement.", roleHref: "/register?role=MERCHANT", color: "bg-slate-100 text-ink" },
  ];

  const problems = [
    "Empty return vehicles waste fuel and road capacity.",
    "Passenger seats and goods space often travel unused.",
    "Transport costs rise when return trips earn nothing.",
    "Bargaining creates uncertainty for users and drivers.",
    "Drivers lose income while fuel wastage increases.",
  ];

  const solutions = [
    "Passengers are matched with empty return seats.",
    "Goods are matched with unused vehicle space.",
    "Nearby-route drops use Captain detour limits.",
    "Verified Captains and checked vehicles build trust.",
    "Fixed prices remove bargaining before booking.",
  ];

  const steps = [
    "Login or create an account",
    "Select your role",
    "Choose pickup and drop dynamically",
    "Get matched with a return vehicle",
    "Pay a fixed smart price",
    "Track live with OTP handoff",
    "Complete the trip and rate",
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[url('/images/hero-transport.svg')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/92 to-brand-900/80" />
        <div className="page-shell relative grid min-h-[760px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <span className="eyebrow !border-white/10 !bg-white/10 !text-sun-400">
              <Leaf className="h-3.5 w-3.5" /> Return Trips Made Useful
            </span>
            <h1 className="display-title max-w-3xl !text-white">Don’t Let Return Trips Go Empty</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Backhaul connects verified return vehicles with passengers and goods moving on the same or nearby route at fixed prices.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link className="btn-primary" href="/login">Login to Continue <ArrowRight className="h-4 w-4" /></Link>
              <Link className="btn-accent" href="/register">Create Account <Users className="h-4 w-4" /></Link>
              <Link className="btn-secondary !bg-white/10 !text-white hover:!bg-white/20" href="/how-it-works">Learn How It Works</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-200">
              {[[BadgeCheck, t("verified")], [Coins, t("fixedPrice")], [MapPinned, t("liveTracking")]].map(([Icon, label]) => {
                const C = Icon as typeof BadgeCheck;
                return <span key={String(label)} className="flex items-center gap-2"><C className="h-4 w-4 text-eco-500" />{String(label)}</span>;
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-8 top-12 h-40 w-40 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-soft backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-sun-400">Live route intelligence</p>
                  <h2 className="mt-1 text-xl font-black text-white">One return route, multiple useful matches</h2>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-ink"><Route /></span>
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-[url('/images/map-route-bg.svg')] bg-cover bg-center p-5">
                <div className="absolute inset-0 bg-white/70" />
                <div className="absolute left-12 top-24 h-36 w-1 rotate-[35deg] rounded bg-brand-500" />
                <Journey icon={<BusFront />} title="RouteMate seat" meta="3 seats available" className="relative mb-16" />
                <Journey icon={<PackageCheck />} title="LoadMate space" meta="Up to 750 kg" className="relative ml-auto" />
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-ink py-4 text-center text-white">
                <Metric value="Fixed" label="fare" />
                <Metric value="Permit" label="checked" />
                <Metric value="Live" label="tracking" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="page-shell grid gap-6 lg:grid-cols-2">
          <InfoPanel eyebrow="The problem" title="Return trips are too often wasted." items={problems} accent="brand" />
          <InfoPanel eyebrow="The Backhaul solution" title="Fill the same route with useful demand." items={solutions} accent="eco" />
        </div>
      </section>

      <section className="section-pad bg-slate-50">
        <div className="page-shell">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="eyebrow">Login-required services</span>
            <h2 className="section-title">{t("services")}</h2>
            <p className="body-copy mt-3">Public pages explain Backhaul. Booking, posting, tracking and dashboards open only after login.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article className="card group transition hover:-translate-y-1" key={service.title}>
                <span className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${service.color}`}><service.icon /></span>
                <h3 className="text-xl font-black">{service.title}</h3>
                <p className="mt-2 leading-6 text-slate-600">{service.copy}</p>
                <div className="mt-6 grid gap-2">
                  <Link href={loginHref} className="btn-primary !py-2">Login required <ArrowRight className="h-4 w-4" /></Link>
                  <Link href={service.roleHref} className="text-center text-sm font-black text-brand-700">Create this account</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-ink text-white" id="how">
        <div className="page-shell">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="eyebrow !border-white/10 !bg-white/10 !text-sun-400">Complete flow</span>
              <h2 className="section-title !text-white">From login to rating, every step is dynamic.</h2>
              <p className="mt-4 leading-7 text-slate-300">Users choose coordinates, Captains post routes, and matching/pricing comes from APIs and database records.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5" key={step}>
                  <span className="mb-5 grid h-9 w-9 place-items-center rounded-xl bg-sun-400 font-black text-ink">{index + 1}</span>
                  <h3 className="text-lg font-black">{step}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {["Start from a protected account.", "RouteMate, LoadMate, Captain, Merchant or Control Hub.", "Search or tap OpenStreetMap.", "Distance, time, permit, capacity and detour are checked.", "See a transparent fare breakdown.", "Use pickup/delivery OTPs and simulated live movement.", "Ratings update Captain scores."][index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="page-shell">
          <div className="mb-9 max-w-3xl">
            <span className="eyebrow">Dynamic map preview</span>
            <h2 className="section-title">Route selection happens after login.</h2>
            <p className="body-copy mt-3">This preview shows pickup/drop markers, a sample route line and the search UI. Real matching remains dynamic after the user logs in.</p>
          </div>
          <LandingMapPreview />
        </div>
      </section>

      <section className="section-pad bg-gradient-to-br from-brand-900 to-ink text-white">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow !border-white/10 !bg-white/10 !text-eco-50">Transparent by design</span>
            <h2 className="section-title !text-white">No Bargaining. Only Fixed Smart Pricing.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">Fare is calculated using distance, vehicle type, fuel cost, mileage, seats available, goods weight, route detour and platform fee.</p>
            <Link href="/pricing" className="btn-accent mt-7">Explore pricing <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[[Fuel, "Fuel + mileage"], [Coins, "Platform fee"], [Users, "Seat sharing"], [MapPinned, "Route detour"]].map(([Icon, label]) => {
              const C = Icon as typeof Fuel;
              return <div className="rounded-3xl border border-white/10 bg-white/5 p-5" key={String(label)}><C className="mb-8 text-sun-400" /><strong>{String(label)}</strong><CheckCircle2 className="ml-auto mt-3 h-4 w-4 text-eco-500" /></div>;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="page-shell">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="eyebrow">Database-ranked</span>
              <h2 className="section-title">{t("popular")}</h2>
            </div>
            <p className="max-w-md text-sm text-slate-500">Ranked from posted trips and completed bookings — never hardcoded cards.</p>
          </div>
          <PopularRoutes />
        </div>
      </section>

      <section className="section-pad bg-eco-50">
        <div className="page-shell">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="eyebrow">Trust on every kilometre</span>
            <h2 className="section-title">Safety is part of the match.</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {[[UserCheck, "Verified Captains"], [Truck, "Vehicle docs"], [ShieldCheck, "Licence checked"], [Smartphone, "Live tracking"], [ShieldCheck, "SOS support"], [BadgeCheck, "OTP handoff"], [Star, "Ratings"]].map(([Icon, label]) => {
              const C = Icon as typeof UserCheck;
              return <div className="rounded-2xl border border-eco-100 bg-white p-4 text-center" key={String(label)}><C className="mx-auto mb-3 h-6 w-6 text-eco-600" /><strong className="text-sm">{String(label)}</strong></div>;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="page-shell">
          <div className="overflow-hidden rounded-[2rem] bg-sun-400 p-8 text-center sm:p-12">
            <Recycle className="mx-auto mb-5 h-10 w-10 text-ink" />
            <h2 className="section-title">Your next return can do more.</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink/70">Login first, then access only the modules allowed for your Backhaul role.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="btn-primary" href="/login">Login to Continue</Link>
              <Link className="btn-secondary" href="/register">Create free account</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoPanel({ eyebrow, title, items, accent }: { eyebrow: string; title: string; items: string[]; accent: "brand" | "eco" }) {
  const iconClass = accent === "brand" ? "bg-brand-50 text-brand-700" : "bg-eco-50 text-eco-700";
  return (
    <div className="card">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div className="flex gap-3 rounded-2xl bg-slate-50 p-4" key={item}>
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${iconClass}`}><CheckCircle2 className="h-3.5 w-3.5" /></span>
            <p className="text-sm leading-6 text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><strong className="block text-sm">{value}</strong><small className="text-[10px] uppercase tracking-wider text-slate-400">{label}</small></div>;
}

function Journey({ icon, title, meta, className }: { icon: ReactNode; title: string; meta: string; className?: string }) {
  return (
    <div className={`flex w-64 items-center gap-3 rounded-2xl bg-white p-3 text-ink shadow-lg ${className || ""}`}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
      <div>
        <strong className="block text-sm">{title}</strong>
        <small className="font-semibold text-eco-700">{meta}</small>
      </div>
    </div>
  );
}
