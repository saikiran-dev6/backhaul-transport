"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingState } from "@/components/ui";
import {
  AdminAnalyticsPanel,
  AdminComplaintsPanel,
  AdminPricingPanel,
  AdminTripsPanel,
  AdminUsersPanel,
  AdminVerificationPanel,
  adminTabs,
  type AdminAnalytics,
  type AdminOverview,
  type AdminPricingRule,
  type AdminVerification,
} from "@/components/admin/AdminPanels";

export function AdminDashboard() {
  const [tab, setTab] = useState("Analytics");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [verification, setVerification] = useState<AdminVerification | null>(null);
  const [rules, setRules] = useState<AdminPricingRule[]>([]);
  const [message, setMessage] = useState("");

  const load = () => Promise.all([
    fetch("/api/admin/analytics").then((response) => response.json()),
    fetch("/api/admin/overview").then((response) => response.json()),
    fetch("/api/admin/verification").then((response) => response.json()),
    fetch("/api/pricing").then((response) => response.json()),
  ]).then(([analyticsData, overviewData, verificationData, pricingData]) => {
    setAnalytics(analyticsData.analytics || null);
    setOverview(overviewData);
    setVerification(verificationData);
    setRules(pricingData.rules || []);
  });

  useEffect(() => {
    void load();
  }, []);

  const verify = async (target: string, id: string, status: string) => {
    const rejectionReason = status === "REJECTED" ? window.prompt("Rejection reason") || "Needs correction" : undefined;
    const response = await fetch("/api/admin/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, id, status, rejectionReason }),
    });
    const data = await response.json();
    setMessage(data.message || data.error);
    void load();
  };

  const saveRule = async (rule: AdminPricingRule) => {
    const response = await fetch("/api/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    const data = await response.json();
    setMessage(response.ok ? `${rule.vehicleType} pricing updated` : data.error);
    void load();
  };

  return (
    <DashboardShell role="Control Hub" title="Marketplace operations." copy="Live users, verification queues, dynamic trips, bookings, pricing, complaints and impact analytics from the database.">
      {message && <p className="mb-5 rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand-800">{message}</p>}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {adminTabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black ${tab === item ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {item}
          </button>
        ))}
      </div>

      {!analytics || !overview || !verification ? (
        <LoadingState label="Loading Control Hub data..." />
      ) : (
        <>
          {tab === "Analytics" && <AdminAnalyticsPanel data={analytics} />}
          {tab === "Users" && <AdminUsersPanel users={overview.users} />}
          {tab === "Verification" && <AdminVerificationPanel data={verification} onVerify={verify} />}
          {tab === "Trips & bookings" && <AdminTripsPanel data={overview} />}
          {tab === "Pricing rules" && <AdminPricingPanel rules={rules} setRules={setRules} save={saveRule} />}
          {tab === "Complaints" && <AdminComplaintsPanel complaints={overview.complaints} />}
        </>
      )}
    </DashboardShell>
  );
}
