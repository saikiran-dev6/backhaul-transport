import { DashboardNotice } from "@/components/DashboardNotice";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { RequireRole } from "@/components/RequireRole";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <RequireRole roles={["LOADMATE"]}>
        <MerchantDashboard />
      </RequireRole>
    </>
  );
}
