import { LoginPage } from "@/components/pages/auth-pages";
import { redirectIfAuthenticated } from "@/lib/auth-session";

export default async function LoginRoute() {
  await redirectIfAuthenticated();

  return <LoginPage />;
}
