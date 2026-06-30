"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations, type Language, type TranslationKey } from "@/lib/i18n/translations";

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => { const saved = localStorage.getItem("backhaul_language") as Language | null; if (saved && translations[saved]) setLanguageState(saved); }, []);
  const setLanguage = (next: Language) => { setLanguageState(next); localStorage.setItem("backhaul_language", next); document.documentElement.lang = next; };
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be inside Providers");
  return context;
}
