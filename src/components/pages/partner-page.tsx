"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useLocale } from "@/components/providers/locale-provider";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

export function PartnerPage() {
  const { direction, messages } = useLocale();
  const ArrowIcon = direction === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-10">
      <section className="panel grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Badge tone="accent">{messages.partner.badge}</Badge>
          <h1 className="font-heading text-4xl font-semibold text-white md:text-5xl">
            {messages.partner.title}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            {messages.partner.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register?role=shop" className={buttonStyles()}>
              <ArrowIcon className="h-4 w-4" />
              {messages.partner.createShopAccount}
            </Link>
            <Link
              href="/login?role=shop&next=/dashboard"
              className={buttonStyles({ variant: "secondary" })}
            >
              {messages.partner.openDashboard}
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          {messages.partner.bullets.map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-[var(--color-secondary)]"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                {point}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.partner.onboardingEyebrow}
          title={messages.partner.onboardingTitle}
          description={messages.partner.onboardingDescription}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: Sparkles, ...messages.partner.onboardingSteps[0] },
            { icon: CalendarClock, ...messages.partner.onboardingSteps[1] },
            { icon: ShieldCheck, ...messages.partner.onboardingSteps[2] },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="panel p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 text-[var(--color-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-heading text-2xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel p-6">
          <h2 className="font-heading text-3xl font-semibold text-white">
            {messages.partner.premiumTitle}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { icon: Camera, ...messages.partner.premiumCards[0] },
              { icon: LayoutDashboard, ...messages.partner.premiumCards[1] },
              { icon: CalendarClock, ...messages.partner.premiumCards[2] },
              { icon: ShieldCheck, ...messages.partner.premiumCards[3] },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-white/8 bg-white/4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(200,169,107,0.14)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-secondary)]">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel space-y-4 p-6">
          <Badge tone="success">{messages.partner.launchBadge}</Badge>
          <h3 className="font-heading text-3xl font-semibold text-white">
            {messages.partner.launchTitle}
          </h3>
          <div className="space-y-3 text-sm text-[var(--color-secondary)]">
            {messages.partner.strategy.map((step, index) => (
              <p key={step}>
                {index + 1}. {step}
              </p>
            ))}
          </div>
          <Link
            href="/register?role=shop"
            className={buttonStyles({ fullWidth: true })}
          >
            {messages.partner.startSignup}
          </Link>
        </div>
      </section>
    </div>
  );
}
