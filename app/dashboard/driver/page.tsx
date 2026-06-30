import { DashboardNotice } from "@/components/DashboardNotice";
import { DriverDashboard } from "@/components/DriverDashboard";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <DriverDashboard />
    </>
  );
}
