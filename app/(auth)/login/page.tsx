"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { dashboardForRole } from "@/lib/roles";

const notices: Record<string, string> = {
  login_required: "Please login to access Backhaul services.",
  service_login: "Please login or create an account before using Backhaul services.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back" copy="Loading secure login…"><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const notice = useMemo(() => notices[params.get("notice") || ""] || "", [params]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setShowRegister(false);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      const invalid = response.status === 401;
      setError(invalid ? "Invalid credentials. Please check your login details or create a new account." : data.error);
      setShowRegister(invalid);
      return;
    }

    localStorage.setItem("backhaul_language", data.user.language);
    router.push(data.requiresRoleSelection ? "/select-role" : dashboardForRole(data.user.sessionRole || data.user.role));
    router.refresh();
  };

  return (
    <AuthShell title="Welcome back" copy="Continue as a RouteMate, LoadMate, Backhaul Captain, Merchant or Control Hub admin.">
      {notice && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{notice}</p>}
      <form className="grid gap-4" onSubmit={submit}>
        <label>
          <span className="label">Email, phone, or username</span>
          <span className="relative block">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input required autoComplete="username" className="field !pl-10" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="passenger@backhaul.test or 9876543210" />
          </span>
        </label>
        <label>
          <span className="flex justify-between">
            <span className="label">Password</span>
            <Link className="text-xs font-bold text-brand-700" href="/forgot-password">Forgot password?</Link>
          </span>
          <span className="relative block">
            <LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input required autoComplete="current-password" type="password" className="field !pl-10" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </span>
        </label>
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            <p>{error}</p>
            {showRegister && <Link className="btn-secondary mt-3 w-full !border-red-200 !bg-white" href="/register">Create a new account</Link>}
          </div>
        )}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Login"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center text-sm text-slate-500">New to Backhaul? <Link className="font-black text-brand-700" href="/register">Create an account</Link></p>
      </form>
      <DemoAccounts />
    </AuthShell>
  );
}

function DemoAccounts() {
  return (
    <div className="mt-6 border-t pt-5">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Demo accounts · password Demo@123</p>
      <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
        <span>RouteMate: passenger@backhaul.test</span>
        <span>LoadMate: goods@backhaul.test</span>
        <span>Captain: driver@backhaul.test</span>
        <span>Merchant: merchant@backhaul.test</span>
        <span>Control Hub: admin@backhaul.test</span>
      </div>
    </div>
  );
}
