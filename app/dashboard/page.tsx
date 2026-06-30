import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readToken } from "@/lib/auth";
import { dashboardForRole } from "@/lib/roles";

export default async function Dashboard() {
  const auth = await readToken(cookies().get("backhaul_token")?.value);
  if (!auth) redirect("/login?notice=login_required");
  if (!auth.sr && auth.accountRole !== "ADMIN") redirect("/select-role");
  redirect(dashboardForRole(auth.role));
}
