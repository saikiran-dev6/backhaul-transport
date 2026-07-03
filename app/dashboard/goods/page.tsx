import { DashboardNotice } from "@/components/DashboardNotice";
import { GoodsDashboard } from "@/components/GoodsDashboard";
import { RequireRole } from "@/components/RequireRole";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <RequireRole roles={["LOADMATE"]}>
        <GoodsDashboard />
      </RequireRole>
    </>
  );
}
