"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/Providers";
import type { Language } from "@/lib/i18n/translations";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return <label className="relative inline-flex items-center gap-2 text-sm font-bold text-slate-600">
    {!compact && <Languages className="h-4 w-4" />}
    <span className="sr-only">Language</span>
    <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded-lg border border-slate-200 bg-white py-2 pl-2 pr-7 text-sm outline-none focus:ring-2 focus:ring-brand-100">
      <option value="en">English</option><option value="te">తెలుగు</option><option value="hi">हिन्दी</option>
    </select>
  </label>;
}
