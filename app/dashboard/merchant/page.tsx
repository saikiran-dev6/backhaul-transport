import { DashboardNotice } from "@/components/DashboardNotice";
import { MerchantDashboard } from "@/components/MerchantDashboard";

export default function Page({ searchParams }: { searchParams: { notice?: string } }) {
  return (
    <>
      <DashboardNotice notice={searchParams.notice} />
      <MerchantDashboard />
    </>
  );
}
