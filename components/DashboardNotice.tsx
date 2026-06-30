export function DashboardNotice({ notice }: { notice?: string }) {
  if (notice !== "permission_denied") return null;
  return (
    <div className="page-shell pt-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
        You do not have permission to access this module.
      </div>
    </div>
  );
}
