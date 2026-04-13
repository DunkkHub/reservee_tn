import { BusinessRouteGuard } from "@/components/guards/route-guards";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["shop", "admin"], "/dashboard");

  return (
    <DashboardShell>
      <BusinessRouteGuard>{children}</BusinessRouteGuard>
    </DashboardShell>
  );
}
