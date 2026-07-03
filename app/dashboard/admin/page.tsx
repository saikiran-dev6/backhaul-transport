import { AdminDashboard } from "@/components/AdminDashboard";
import { DashboardNotice } from "@/components/DashboardNotice";
import { RequireRole } from "@/components/RequireRole";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <RequireRole roles={["ADMIN"]}>
        <AdminDashboard />
      </RequireRole>
    </>
  );
}
