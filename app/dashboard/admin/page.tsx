import { AdminDashboard } from "@/components/AdminDashboard";
import { DashboardNotice } from "@/components/DashboardNotice";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <AdminDashboard />
    </>
  );
}
