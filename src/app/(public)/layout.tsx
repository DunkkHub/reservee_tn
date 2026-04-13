import { PublicRouteGuard } from "@/components/guards/route-guards";
import { PublicShell } from "@/components/layout/public-shell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <PublicRouteGuard>{children}</PublicRouteGuard>
    </PublicShell>
  );
}
