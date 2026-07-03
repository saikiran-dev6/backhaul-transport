import { DashboardNotice } from "@/components/DashboardNotice";
import { DriverDashboard } from "@/components/DriverDashboard";
import { RequireRole } from "@/components/RequireRole";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <RequireRole roles={["CAPTAIN"]}>
        <DriverDashboard />
      </RequireRole>
    </>
  );
}
