"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  KeyRound,
  LogIn,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/lib/api-response";
import { getCategoryTranslation, getCityTranslation } from "@/lib/i18n";
import { categories, cities } from "@/lib/taxonomy";
import type { AuthDeliveryChannel, AuthSession } from "@/lib/auth-types";
import type { CategorySlug } from "@/lib/types";

type VerificationChallengePayload = {
  challengeId: string;
  expiresAt: string;
  deliveryChannel: AuthDeliveryChannel;
  destinationHint: string;
  developmentCodePreview: string | null;
};

type AuthApiPayload = {
  redirectTo?: string;
  session?: AuthSession | null;
  challenge?: VerificationChallengePayload | null;
};

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function looksLikeEmailIdentifier(value: string) {
  return value.includes("@");
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
  const { messages } = useLocale();

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
            { icon: UserRound, ...messages.auth.featureCards[0] },
            { icon: Building2, ...messages.auth.featureCards[1] },
            { icon: ShieldCheck, ...messages.auth.featureCards[2] },
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

function DeliveryChannelPicker({
  value,
  onChange,
  emailLabel,
  smsLabel,
}: {
  value: AuthDeliveryChannel;
  onChange: (value: AuthDeliveryChannel) => void;
  emailLabel: string;
  smsLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/8 bg-white/4 p-1">
      {[
        { id: "sms", label: smsLabel },
        { id: "email", label: emailLabel },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id as AuthDeliveryChannel)}
          className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium transition ${
            value === option.id
              ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
              : "text-[var(--color-secondary)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "error" | "neutral";
}) {
  const className =
    tone === "success"
      ? "border-[rgba(59,178,115,0.22)] bg-[rgba(59,178,115,0.12)] text-[var(--color-success)]"
      : tone === "error"
        ? "border-[rgba(225,85,84,0.22)] bg-[rgba(225,85,84,0.12)] text-[var(--color-error)]"
        : "border-white/8 bg-white/4 text-[var(--color-secondary)]";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{children}</div>;
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages } = useLocale();
  const next = searchParams.get("next");
  const roleHint = searchParams.get("role");
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    code: "",
    deliveryChannel: "sms" as AuthDeliveryChannel,
  });
  const [challenge, setChallenge] = useState<VerificationChallengePayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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

  const resetPasswordHref = useMemo(() => {
    const params = new URLSearchParams();

    if (form.identifier.trim()) {
      params.set("identifier", form.identifier.trim());
    }

    const query = params.toString();
    return query ? `/reset-password?${query}` : "/reset-password";
  }, [form.identifier]);

  async function requestLoginCode() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: form.identifier,
          password: form.password,
          deliveryChannel: form.deliveryChannel,
        }),
      });

      const data = (await response.json()) as ApiResponse<AuthApiPayload>;
      const challengePayload = data.data?.challenge;

      if (!response.ok || !data.ok || !challengePayload) {
        setError(data.message || messages.auth.loginFailed);
        return;
      }

      setChallenge(challengePayload);
      setForm((current) => ({ ...current, code: "" }));
      setMessage(data.message ?? messages.auth.loginFailed);
    } catch {
      setError(messages.auth.loginFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyLoginCode() {
    if (!challenge) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          code: form.code,
        }),
      });

      const data = (await response.json()) as ApiResponse<AuthApiPayload>;
      const sessionPayload = data.data?.session;

      if (!response.ok || !data.ok || !sessionPayload) {
        setError(data.message || messages.auth.loginFailed);
        return;
      }

      setSession(sessionPayload);
      let destination = data.data?.redirectTo ?? "/";

      if (isSafeInternalPath(next) && next) {
        destination = next;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError(messages.auth.loginFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function resetChallenge() {
    setChallenge(null);
    setForm((current) => ({ ...current, code: "" }));
    setMessage("");
    setError("");
  }

  return (
    <AuthShell
      eyebrow={messages.auth.loginEyebrow}
      title={messages.auth.loginTitle}
      description={messages.auth.loginDescription}
      footer={
        <div className="space-y-2">
          <p>
            {messages.auth.noAccountPrefix}{" "}
            <Link href={registerHref} className="text-white underline underline-offset-4">
              {messages.auth.createOne}
            </Link>
            .
          </p>
          <p>
            <Link href={resetPasswordHref} className="text-white underline underline-offset-4">
              {messages.auth.forgotPassword}
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-white">
            {messages.auth.welcomeBack}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-secondary)]">
            {roleHint === "shop"
              ? messages.auth.shopSignInHint
              : messages.auth.signInHint}
          </p>
        </div>

        {!challenge ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void requestLoginCode();
            }}
          >
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.auth.phoneOrEmail}
              </span>
              <input
                className="input-field"
                type="text"
                value={form.identifier}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    identifier: event.target.value,
                  }))
                }
                placeholder={messages.auth.phoneOrEmailPlaceholder}
                autoComplete="username"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">{messages.auth.password}</span>
              <input
                className="input-field"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder={messages.auth.minPassword}
                autoComplete="current-password"
              />
            </label>

            <div className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.auth.deliveryChannel}
              </span>
              <DeliveryChannelPicker
                value={form.deliveryChannel}
                onChange={(value) =>
                  setForm((current) => ({ ...current, deliveryChannel: value }))
                }
                emailLabel={messages.auth.emailCode}
                smsLabel={messages.auth.smsCode}
              />
            </div>

            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            <Button
              type="submit"
              fullWidth
              icon={<MessageSquareText className="h-4 w-4" />}
              disabled={submitting}
            >
              {submitting ? messages.auth.sendingCode : messages.auth.sendLoginCode}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Notice tone="neutral">
              {messages.auth.verificationStep.replace("{destination}", challenge.destinationHint)}
            </Notice>

            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.manageBooking.verificationCode}
              </span>
              <input
                className="input-field"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                placeholder={messages.manageBooking.verificationCodePlaceholder}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>

            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            <div className="flex flex-wrap gap-3">
              <Button
                icon={<LogIn className="h-4 w-4" />}
                disabled={!form.code.trim() || submitting}
                onClick={() => void verifyLoginCode()}
              >
                {submitting ? messages.auth.verifyingCode : messages.auth.verifyAndSignIn}
              </Button>
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => void requestLoginCode()}
              >
                {messages.auth.resendCode}
              </Button>
              <Button variant="ghost" disabled={submitting} onClick={resetChallenge}>
                {messages.auth.useDifferentCredentials}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs leading-6 text-[var(--color-muted)]">
          {messages.auth.adminNote}
        </p>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useLocale();
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
  const localizedCategories = categories.map((category) => ({
    ...category,
    ...getCategoryTranslation(category.slug, locale),
  }));
  const localizedCities = cities.map((city) => ({
    ...city,
    ...(getCityTranslation(city.slug, locale) ?? { name: city.name }),
  }));

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
      setError(messages.auth.passwordMismatch);
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

      const data = (await response.json()) as ApiResponse<AuthApiPayload>;
      const sessionPayload = data.data?.session;

      if (!response.ok || !data.ok || !sessionPayload) {
        setError(data.message || messages.auth.registerFailed);
        return;
      }

      setSession(sessionPayload);
      let destination = data.data?.redirectTo ?? "/";

      if (isSafeInternalPath(next) && next) {
        destination = next;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError(messages.auth.registerFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={messages.auth.registerEyebrow}
      title={messages.auth.registerTitle}
      description={messages.auth.registerDescription}
      footer={
        <p>
          {messages.auth.alreadyAccountPrefix}{" "}
          <Link href={loginHref} className="text-white underline underline-offset-4">
            {messages.auth.signInHere}
          </Link>
          .
        </p>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-white/8 bg-white/4 p-1">
          {[
            { id: "customer", label: messages.auth.customer },
            { id: "shop", label: messages.auth.shop },
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
            <span className="text-[var(--color-secondary)]">{messages.auth.fullName}</span>
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
            <span className="text-[var(--color-secondary)]">{messages.auth.email}</span>
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
            <span className="text-[var(--color-secondary)]">{messages.auth.phone}</span>
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
                <span className="text-[var(--color-secondary)]">
                  {messages.auth.businessName}
                </span>
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
                  <span className="text-[var(--color-secondary)]">
                    {messages.auth.category}
                  </span>
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
                    {localizedCategories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 text-sm">
                  <span className="text-[var(--color-secondary)]">{messages.auth.city}</span>
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
                    {localizedCities.map((city) => (
                      <option key={city.id} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">{messages.auth.area}</span>
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
              <span className="text-[var(--color-secondary)]">{messages.auth.password}</span>
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
              <span className="text-[var(--color-secondary)]">
                {messages.auth.confirmPassword}
              </span>
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
              ? messages.auth.createAccount
              : role === "shop"
                ? messages.auth.createShopAccount
                : messages.auth.createCustomerAccount}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages } = useLocale();
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    identifier: searchParams.get("identifier") ?? "",
    code: "",
    password: "",
    confirmPassword: "",
    deliveryChannel: (looksLikeEmailIdentifier(searchParams.get("identifier") ?? "")
      ? "email"
      : "sms") as AuthDeliveryChannel,
  });
  const [challenge, setChallenge] = useState<VerificationChallengePayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function requestResetCode() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: form.identifier,
          deliveryChannel: form.deliveryChannel,
        }),
      });

      const data = (await response.json()) as ApiResponse<AuthApiPayload>;
      const challengePayload = data.data?.challenge;

      if (!response.ok || !data.ok) {
        setError(data.message || messages.auth.resetFailed);
        return;
      }

      setChallenge(challengePayload ?? null);
      setForm((current) => ({ ...current, code: "" }));
      setMessage(data.message ?? messages.auth.resetFailed);
    } catch {
      setError(messages.auth.resetFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPasswordReset() {
    if (!challenge) {
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(messages.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          code: form.code,
          password: form.password,
        }),
      });

      const data = (await response.json()) as ApiResponse<AuthApiPayload>;
      const sessionPayload = data.data?.session;

      if (!response.ok || !data.ok || !sessionPayload) {
        setError(data.message || messages.auth.resetFailed);
        return;
      }

      setSession(sessionPayload);
      router.push(data.data?.redirectTo ?? "/account");
      router.refresh();
    } catch {
      setError(messages.auth.resetFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setChallenge(null);
    setForm((current) => ({
      ...current,
      code: "",
      password: "",
      confirmPassword: "",
    }));
    setMessage("");
    setError("");
  }

  return (
    <AuthShell
      eyebrow={messages.auth.resetPasswordEyebrow}
      title={messages.auth.resetPasswordTitle}
      description={messages.auth.resetPasswordDescription}
      footer={
        <p>
          <Link href="/login" className="text-white underline underline-offset-4">
            {messages.auth.backToLogin}
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-white">
            {messages.auth.resetPasswordHeading}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-secondary)]">
            {messages.auth.resetPasswordHint}
          </p>
        </div>

        {!challenge ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void requestResetCode();
            }}
          >
            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.auth.phoneOrEmail}
              </span>
              <input
                className="input-field"
                type="text"
                value={form.identifier}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    identifier: event.target.value,
                  }))
                }
                placeholder={messages.auth.phoneOrEmailPlaceholder}
                autoComplete="username"
              />
            </label>

            <div className="space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.auth.deliveryChannel}
              </span>
              <DeliveryChannelPicker
                value={form.deliveryChannel}
                onChange={(value) =>
                  setForm((current) => ({ ...current, deliveryChannel: value }))
                }
                emailLabel={messages.auth.emailCode}
                smsLabel={messages.auth.smsCode}
              />
            </div>

            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            <Button
              type="submit"
              fullWidth
              icon={<KeyRound className="h-4 w-4" />}
              disabled={submitting}
            >
              {submitting ? messages.auth.sendingCode : messages.auth.sendResetCode}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Notice tone="neutral">
              {messages.auth.resetStep.replace("{destination}", challenge.destinationHint)}
            </Notice>

            <label className="block space-y-2 text-sm">
              <span className="text-[var(--color-secondary)]">
                {messages.manageBooking.verificationCode}
              </span>
              <input
                className="input-field"
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                placeholder={messages.manageBooking.verificationCodePlaceholder}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">{messages.auth.newPassword}</span>
                <input
                  className="input-field"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-[var(--color-secondary)]">
                  {messages.auth.confirmPassword}
                </span>
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

            {message ? <Notice tone="success">{message}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            <div className="flex flex-wrap gap-3">
              <Button
                icon={<KeyRound className="h-4 w-4" />}
                disabled={!form.code.trim() || !form.password.trim() || submitting}
                onClick={() => void confirmPasswordReset()}
              >
                {submitting ? messages.auth.resettingPassword : messages.auth.resetPasswordAction}
              </Button>
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => void requestResetCode()}
              >
                {messages.auth.resendCode}
              </Button>
              <Button variant="ghost" disabled={submitting} onClick={resetFlow}>
                {messages.auth.useDifferentContact}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
