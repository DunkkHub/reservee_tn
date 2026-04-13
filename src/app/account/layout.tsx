import { AccountShell } from "@/components/layout/account-shell";
import { requireRole } from "@/lib/auth-session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["customer"], "/account");

  return <AccountShell>{children}</AccountShell>;
}
