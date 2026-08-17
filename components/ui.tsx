import { BadgeCheck, LoaderCircle, MapPin, PackageOpen } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const good = ["APPROVED", "ACTIVE", "CONFIRMED", "PAID", "COMPLETED", "DELIVERED"].includes(status);
  const bad = ["REJECTED", "CANCELLED", "FAILED"].includes(status);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${good ? "bg-eco-50 text-eco-700" : bad ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{status.replaceAll("_", " ")}</span>;
}

export function LoadingState({ label = "Finding the best return routes…" }: { label?: string }) { return <div className="grid min-h-40 place-items-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-8 text-center"><div><LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin text-brand-600" /><p className="font-bold text-slate-600">{label}</p></div></div>; }

export function EmptyState({ title = "No matching return trips yet", copy = "Try a wider date window or post a new route as a Backhaul Captain." }: { title?: string; copy?: string }) { return <div className="grid min-h-48 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><PackageOpen className="mx-auto mb-3 h-9 w-9 text-slate-400" /><h3 className="font-black text-ink">{title}</h3><p className="mt-1 max-w-md text-sm text-slate-500">{copy}</p></div></div>; }

export function PriceBreakdown({ fare, breakdown }: { fare: number; breakdown: Record<string, number> }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><div className="mb-3 flex items-end justify-between"><span className="text-sm font-bold text-slate-500">Fixed price</span><strong className="text-2xl text-ink">₹{fare.toLocaleString("en-IN")}</strong></div><div className="space-y-1.5 border-t border-slate-200 pt-3">{Object.entries(breakdown).map(([key, value]) => <div className="flex justify-between text-xs text-slate-500" key={key}><span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span><span>{key.toLowerCase().includes("discount") ? "−" : ""}₹{Math.abs(value).toFixed(0)}</span></div>)}</div></div>;
}

export function RouteLine({ from, to }: { from: string; to: string }) { return <div className="flex min-w-0 items-start gap-3"><div className="mt-1 flex flex-col items-center"><span className="h-3 w-3 rounded-full border-[3px] border-brand-600 bg-white" /><span className="h-8 w-px bg-slate-300" /><MapPin className="h-4 w-4 text-eco-600" /></div><div className="min-w-0 space-y-5 text-sm font-bold"><p className="truncate">{from}</p><p className="truncate">{to}</p></div></div>; }

export function VerifiedBadge() { return <span className="inline-flex items-center gap-1 rounded-full bg-eco-50 px-2 py-1 text-xs font-extrabold text-eco-700"><BadgeCheck className="h-3.5 w-3.5" /> Safety verified</span>; }

export function ErrorState({ title = "Something went wrong", copy = "Please try again in a moment." }: { title?: string; copy?: string }) {
  return <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-red-800"><h3 className="font-black">{title}</h3><p className="mt-1 text-sm font-semibold">{copy}</p></div>;
}

export function SuccessToast({ message }: { message: string }) {
  return <div className="rounded-2xl border border-eco-100 bg-eco-50 p-3 text-sm font-black text-eco-700">{message}</div>;
}

export function ConfirmationModal({ title, copy, confirmLabel = "Confirm", onConfirm, onCancel }: { title: string; copy: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><div className="card max-w-md"><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-600">{copy}</p><div className="mt-6 flex justify-end gap-2"><button className="btn-secondary" onClick={onCancel}>Cancel</button><button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

export function VerificationBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-extrabold ${status === "APPROVED" ? "bg-eco-50 text-eco-700" : status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}><BadgeCheck className="h-3.5 w-3.5" /> {status.replaceAll("_", " ")}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-700">{role.replaceAll("_", " ")}</span>;
}

export function RouteSummaryCard({ from, to, meta }: { from: string; to: string; meta?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><RouteLine from={from} to={to} />{meta && <p className="mt-3 text-xs font-bold text-slate-500">{meta}</p>}</div>;
}

export function BookingStatusTimeline({ steps }: { steps: Array<{ label: string; done?: boolean }> }) {
  return <div className="grid gap-2">{steps.map((step, index) => <div key={step.label} className="flex items-center gap-3 text-sm"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${step.done ? "bg-eco-600 text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span><span className={step.done ? "font-bold text-ink" : "text-slate-500"}>{step.label}</span></div>)}</div>;
}

export function LiveTrackingCard({ title, copy }: { title: string; copy: string }) {
  return <div className="rounded-3xl border border-brand-100 bg-brand-50 p-5"><p className="eyebrow">Live tracking</p><h3 className="text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-600">{copy}</p></div>;
}
