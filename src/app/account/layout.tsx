import { AccountShell } from "@/components/layout/account-shell";
import { requireCustomer } from "@/lib/auth-guards";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomer("/account");

  return <AccountShell>{children}</AccountShell>;
}
