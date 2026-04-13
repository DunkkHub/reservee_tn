"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, LogIn, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, cities } from "@/lib/seed-data";
import type { AuthSession } from "@/lib/auth-types";
import type { CategorySlug } from "@/lib/types";

type AuthApiResponse = {
  ok: boolean;
  message: string;
  redirectTo?: string;
  session?: AuthSession | null;
};

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="panel space-y-6 p-6 md:p-8">
        <Badge tone="accent">{eyebrow}</Badge>
        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-semibold text-white md:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            {description}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: UserRound,
              title: "Customer space",
              text: "Track upcoming appointments and manage bookings without entering the business dashboard.",
            },
            {
              icon: Building2,
              title: "Shop space",
              text: "Salon and barber owners get a private dashboard for services, hours, bookings and onboarding.",
            },
            {
              icon: ShieldCheck,
              title: "Admin space",
              text: "Moderation stays separate so platform operations are never mixed with customer or shop views.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-heading text-xl font-semibold text-white">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-6 md:p-8">
        {children}
        <div className="mt-6 border-t border-white/8 pt-6 text-sm text-[var(--color-secondary)]">
          {footer}
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const roleHint = searchParams.get("role");
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams();

    if (roleHint === "shop" || roleHint === "customer") {
      params.set("role", roleHint);
    }

    if (next) {
      params.set("next", next);
    }

    const query = params.toString();
    return query ? `/register?${query}` : "/register";
  }, [next, roleHint]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as AuthApiResponse;

      if (!response.ok || !data.ok || !data.session) {
        setError(data.message || "Login failed.");
        return;
      }

      setSession(data.session);
      let destination = data.redirectTo ?? "/";

      if (isSafeInternalPath(next) && next) {
        destination = next;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Login"
      title="Sign in to the right space"
      description="Customers, shop owners, and admins can use the same sign-in screen, but each role is redirected to its own protected area after login."
      footer={
        <p>
          No account yet?{" "}
          <Link href={registerHref} className="text-white underline underline-offset-4">
            Create one here
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--color-secondary)]">
            {roleHint === "shop"
              ? "Sign in to your partner dashboard."
              : "Sign in to continue."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Email</span>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Password</span>
            <input
              className="input-field"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Minimum 8 characters"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.12)] px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            fullWidth
            icon={<LogIn className="h-4 w-4" />}
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-xs leading-6 text-[var(--color-muted)]">
          Admin accounts are created directly in MySQL, so admins sign in here but are not
          self-registered from the public form.
        </p>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const requestedRole = searchParams.get("role");
  const defaultRole = requestedRole === "shop" ? "shop" : "customer";
  const { setSession } = useAuth();
  const [role, setRole] = useState<"customer" | "shop">(defaultRole);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    categorySlug: "barbers" as CategorySlug,
    citySlug: cities[0]?.slug ?? "tunis",
    area: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("role", role);

    if (next) {
      params.set("next", next);
    }

    return `/login?${params.toString()}`;
  }, [next, role]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const payload =
        role === "shop"
          ? {
              role,
              name: form.name,
              email: form.email,
              phone: form.phone,
              password: form.password,
              businessName: form.businessName,
              categorySlug: form.categorySlug,
              citySlug: form.citySlug,
              area: form.area,
            }
          : {
              role,
              name: form.name,
              email: form.email,
              phone: form.phone,
              password: form.password,
            };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AuthApiResponse;

      if (!response.ok || !data.ok || !data.session) {
        setError(data.message || "Registration failed.");
        return;
      }

      setSession(data.session);
      let destination = data.redirectTo ?? "/";

      if (isSafeInternalPath(next) && next) {
        destination = next;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Register"
      title="Create a customer or shop account"
      description="Customers and business owners do not share the same workspace. Choose the role you need now, and the platform sends you to the right area after signup."
      footer={
        <p>
          Already have an account?{" "}
          <Link href={loginHref} className="text-white underline underline-offset-4">
            Sign in here
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-white/8 bg-white/4 p-1">
          {[
            { id: "customer", label: "Customer" },
            { id: "shop", label: "Shop" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRole(option.id as "customer" | "shop")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                role === option.id
                  ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                  : "text-[var(--color-secondary)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Full name</span>
            <input
              className="input-field"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              autoComplete="name"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Email</span>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              autoComplete="email"
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-[var(--color-secondary)]">Phone</span>
            <input
              className="input-field"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              autoComplete="tel"
              placeholder="+216 ..."
            />
          </label>

          {role === "shop" ? (
            <>
              <label className="block space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Business name</span>
                <input
                  className="input-field"
                  value={form.businessName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="text-[var(--color-secondary)]">Category</span>
                  <select
                    className="input-field"
                    value={form.categorySlug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        categorySlug: event.target.value as CategorySlug,
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="text-[var(--color-secondary)]">City</span>
                  <select
                    className="input-field"
                    value={form.citySlug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        citySlug: event.target.value,
                      }))
                    }
                  >
                    {cities.map((city) => (
                      <option key={city.id} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">Area</span>
                <input
                  className="input-field"
                  value={form.area}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, area: event.target.value }))
                  }
                />
              </label>
            </>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Password</span>
              <input
                className="input-field"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">Confirm password</span>
              <input
                className="input-field"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.12)] px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          ) : null}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting
              ? "Creating account..."
              : role === "shop"
                ? "Create shop account"
                : "Create customer account"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
