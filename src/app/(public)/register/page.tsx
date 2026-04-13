import { RegisterPage } from "@/components/pages/auth-pages";
import { redirectIfAuthenticated } from "@/lib/auth-session";

export default async function RegisterRoute() {
  await redirectIfAuthenticated();

  return <RegisterPage />;
}
