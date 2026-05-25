import { BusinessRouteGuard } from "@/components/guards/route-guards";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireBusiness } from "@/lib/auth-guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBusiness("/dashboard");

  return (
    <DashboardShell>
      <BusinessRouteGuard>{children}</BusinessRouteGuard>
    </DashboardShell>
  );
}
