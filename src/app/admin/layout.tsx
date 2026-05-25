import { AdminRouteGuard } from "@/components/guards/route-guards";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdmin } from "@/lib/auth-guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/admin");

  return (
    <AdminShell>
      <AdminRouteGuard>{children}</AdminRouteGuard>
    </AdminShell>
  );
}
