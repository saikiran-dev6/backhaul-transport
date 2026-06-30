export function AuthShell({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  return <section className="bg-gradient-to-br from-brand-50 via-white to-eco-50 py-16 sm:py-24"><div className="page-shell"><div className="card mx-auto max-w-xl"><div className="mb-7 text-center"><span className="eyebrow">Secure Backhaul access</span><h1 className="text-3xl font-black sm:text-4xl">{title}</h1><p className="mt-3 text-slate-600">{copy}</p></div>{children}</div></div></section>;
}
