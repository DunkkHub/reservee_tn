import { ResetPasswordPage } from "@/components/pages/auth-pages";
import { redirectIfAuthenticated } from "@/lib/auth-session";

export default async function ResetPasswordRoute() {
  await redirectIfAuthenticated();

  return <ResetPasswordPage />;
}
