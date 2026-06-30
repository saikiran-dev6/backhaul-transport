"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Route, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/Providers";

export function Navbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [{ href: "/", label: t("home") }, { href: "/how-it-works", label: t("how") }, { href: "/passenger", label: t("passenger") }, { href: "/goods", label: t("goods") }, { href: "/driver", label: t("driver") }, { href: "/safety", label: t("safety") }];
  return <header className="sticky top-0 z-[1000] border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
    <div className="page-shell flex h-18 items-center justify-between gap-4 py-3">
      <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Route className="h-5 w-5" /></span><span><strong className="block text-lg leading-5 tracking-tight">Backhaul</strong><small className="text-[10px] font-bold uppercase tracking-[.15em] text-eco-600">{t("tagline")}</small></span></Link>
      <nav className="hidden items-center gap-1 lg:flex">{links.map((link) => <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${pathname === link.href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}>{link.label}</Link>)}</nav>
      <div className="hidden items-center gap-2 sm:flex"><LanguageSwitcher compact /><Link className="btn-secondary !min-h-9 !px-3 !py-2" href="/login">{t("login")}</Link><Link className="btn-primary !min-h-9 !px-3 !py-2" href="/register">{t("register")}</Link></div>
      <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
    </div>
    {open && <div className="border-t bg-white px-4 pb-5 pt-3 lg:hidden"><nav className="grid gap-1">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-brand-50">{link.label}</Link>)}</nav><div className="mt-3 flex flex-wrap gap-2 border-t pt-4"><LanguageSwitcher /><Link href="/login" className="btn-secondary flex-1">{t("login")}</Link><Link href="/register" className="btn-primary flex-1">{t("register")}</Link></div></div>}
  </header>;
}
