import Link from "next/link";
import { Route } from "lucide-react";

export function Footer() {
  const links = [{ label: "About", href: "/how-it-works" }, { label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }, { label: "Driver policy", href: "/driver" }, { label: "Goods policy", href: "/goods" }, { label: "Safety", href: "/safety" }, { label: "Contact", href: "/contact" }];
  return <footer className="border-t border-slate-200 bg-ink text-white"><div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr]"><div><div className="mb-3 flex items-center gap-2 text-xl font-black"><Route className="text-sun-400" /> Backhaul</div><p className="max-w-md text-sm leading-6 text-slate-300">Making return trips useful for RouteMates, LoadMates, Merchants and verified Backhaul Captains—without bargaining.</p></div><div className="flex flex-wrap content-start gap-x-5 gap-y-3">{links.map((link) => <Link className="text-sm font-semibold text-slate-300 hover:text-white" href={link.href} key={link.label}>{link.label}</Link>)}</div></div><div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Backhaul. MVP uses OpenStreetMap and mock payments/OTP.</div></footer>;
}
