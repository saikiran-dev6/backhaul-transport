import { DashboardNotice } from "@/components/DashboardNotice";
import { GoodsDashboard } from "@/components/GoodsDashboard";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <GoodsDashboard />
    </>
  );
}
