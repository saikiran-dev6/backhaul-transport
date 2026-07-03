import { DashboardNotice } from "@/components/DashboardNotice";
import { PassengerDashboard } from "@/components/PassengerDashboard";
import { RequireRole } from "@/components/RequireRole";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <RequireRole roles={["ROUTEMATE"]}>
        <PassengerDashboard />
      </RequireRole>
    </>
  );
}
