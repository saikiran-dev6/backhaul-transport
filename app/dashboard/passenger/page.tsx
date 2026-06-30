import { DashboardNotice } from "@/components/DashboardNotice";
import { PassengerDashboard } from "@/components/PassengerDashboard";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <PassengerDashboard />
    </>
  );
}
