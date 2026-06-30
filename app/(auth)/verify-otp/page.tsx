"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { dashboardForRole } from "@/lib/roles";

export default function VerifyOtp() {
  return (
    <Suspense fallback={<AuthShell title="Verify your OTP" copy="Loading verification…"><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /></AuthShell>}>
      <VerifyOtpForm />
    </Suspense>
  );
}

function VerifyOtpForm() {
  const params = useSearchParams();
  const router = useRouter();
  const identifier = params.get("identifier") || "";
  const [otp, setOtp] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setHint(sessionStorage.getItem("backhaul_otp_hint") || "123456"), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    router.push(data.requiresRoleSelection ? "/select-role" : dashboardForRole(data.sessionRole || data.role));
  };

  return (
    <AuthShell title="Verify your OTP" copy={`Enter the six-digit code sent to ${identifier}.`}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Local mock OTP:</strong> {hint || "123456"}</div>
        <input aria-label="OTP" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="field text-center font-mono text-3xl tracking-[.4em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} />
        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
        <button className="btn-primary">Verify account</button>
      </form>
    </AuthShell>
  );
}
