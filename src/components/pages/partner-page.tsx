"use client";

import Image from "next/image";
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
      <section className="premium-ring relative overflow-hidden rounded-xl border border-[rgba(54,43,35,0.08)] bg-[var(--color-surface)]">
        <Image
          src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80"
          alt={messages.partner.title}
          fill
          preload
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,250,243,0.96)_0%,rgba(255,250,243,0.84)_52%,rgba(255,250,243,0.34)_100%)]" />
        <div className="relative grid min-h-[560px] content-end gap-8 px-5 py-8 md:px-8 md:py-10">
          <div className="max-w-3xl space-y-5">
            <div className="motion-fade-up">
              <Badge tone="accent">{messages.partner.badge}</Badge>
            </div>
            <h1 className="motion-fade-up motion-delay-1 font-heading text-4xl font-semibold text-[var(--color-foreground)] md:text-5xl">
              {messages.partner.title}
            </h1>
            <p className="motion-fade-up motion-delay-2 max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
              {messages.partner.description}
            </p>
            <div className="motion-fade-up motion-delay-3 flex flex-wrap gap-3">
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
          <div className="stagger-children grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {messages.partner.bullets.map((point) => (
              <div
                key={point}
                className="panel-soft p-4 text-sm text-[var(--color-secondary)] backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  {point}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow={messages.partner.onboardingEyebrow}
          title={messages.partner.onboardingTitle}
          description={messages.partner.onboardingDescription}
        />
        <div className="stagger-children grid gap-4 lg:grid-cols-3">
          {[
            { icon: Sparkles, ...messages.partner.onboardingSteps[0] },
            { icon: CalendarClock, ...messages.partner.onboardingSteps[1] },
            { icon: ShieldCheck, ...messages.partner.onboardingSteps[2] },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="panel shine-card interactive-card p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(22,116,102,0.08)] text-[var(--color-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-heading text-2xl font-semibold text-[var(--color-foreground)]">
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
        <div className="panel shine-card scroll-reveal p-6">
          <h2 className="font-heading text-3xl font-semibold text-[var(--color-foreground)]">
            {messages.partner.premiumTitle}
          </h2>
          <div className="stagger-children mt-6 grid gap-4 md:grid-cols-2">
            {[
              { icon: Camera, ...messages.partner.premiumCards[0] },
              { icon: LayoutDashboard, ...messages.partner.premiumCards[1] },
              { icon: CalendarClock, ...messages.partner.premiumCards[2] },
              { icon: ShieldCheck, ...messages.partner.premiumCards[3] },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="panel-soft interactive-card p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(231,201,147,0.25)] text-[var(--color-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold text-[var(--color-foreground)]">
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
        <div className="panel grid-sheen scroll-reveal space-y-4 p-6">
          <Badge tone="success">{messages.partner.launchBadge}</Badge>
          <h3 className="font-heading text-3xl font-semibold text-[var(--color-foreground)]">
            {messages.partner.launchTitle}
          </h3>
          <div className="space-y-3 text-sm text-[var(--color-secondary)]">
            {messages.partner.strategy.map((step) => (
              <p key={step} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span>{step}</span>
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
