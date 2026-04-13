import { AdminRouteGuard } from "@/components/guards/route-guards";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireRole } from "@/lib/auth-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"], "/admin");

  return (
    <AdminShell>
      <AdminRouteGuard>{children}</AdminRouteGuard>
    </AdminShell>
  );
}
