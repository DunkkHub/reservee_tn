import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

export function PartnerPage() {
  return (
    <div className="space-y-10">
      <section className="panel grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Badge tone="accent">For businesses</Badge>
          <h1 className="font-heading text-4xl font-semibold text-white md:text-5xl">
            Get booked, stay organized, and look premium online.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--color-secondary)]">
            Reservee TN is built for barbers, hair salons, beauty centers, nail studios and
            spas in Tunisia. Version 1 focuses on helping you look professional, manage
            availability cleanly, and reduce the mess of WhatsApp-only booking.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register?role=shop">
              <Button icon={<ArrowRight className="h-4 w-4" />}>
                Create shop account
              </Button>
            </Link>
            <Link href="/login?role=shop&next=/dashboard">
              <Button variant="secondary">Open dashboard</Button>
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          {[
            "Professional public page with services, prices, photos and policies",
            "Shared availability calendar with blocked dates and clean slot generation",
            "One inbox for pending, confirmed, completed, cancelled and no-show bookings",
            "Admin approval and verification before you go live",
          ].map((point) => (
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
          eyebrow="Onboarding"
          title="Simple multi-step setup for busy owners"
          description="The onboarding stays narrow and practical so the first ten to twenty business profiles can look strong quickly, even with manual help."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Step 1-3",
              text: "Add basics, visual identity, then services with clear titles, prices and durations.",
            },
            {
              icon: CalendarClock,
              title: "Step 4-5",
              text: "Define opening hours, breaks, blocked times and cancellation expectations.",
            },
            {
              icon: ShieldCheck,
              title: "Step 6",
              text: "Submit for approval so fake or low-quality profiles never go live immediately.",
            },
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
            Premium details that matter
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Camera,
                title: "Visual polish",
                text: "Cover image, logo-like monogram, gallery and elegant spacing make the listing feel expensive rather than generic.",
              },
              {
                icon: LayoutDashboard,
                title: "Clean dashboard",
                text: "Owners see today's bookings, pending requests, no-shows and profile completion without scary complexity.",
              },
              {
                icon: CalendarClock,
                title: "Accurate availability",
                text: "Slots are generated from one shared calendar per business in version 1, which keeps the logic simple and dependable.",
              },
              {
                icon: ShieldCheck,
                title: "Trust signals",
                text: "Verification, policies, social links and admin moderation make the platform feel real from launch day.",
              },
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
          <Badge tone="success">Launch strategy</Badge>
          <h3 className="font-heading text-3xl font-semibold text-white">
            Go deep before going broad
          </h3>
          <div className="space-y-3 text-sm text-[var(--color-secondary)]">
            <p>1. Build the MVP and make the public pages look strong.</p>
            <p>2. Manually onboard the first 10-20 businesses.</p>
            <p>3. Start with one city like Tunis, Sousse, Sfax or Hammamet.</p>
            <p>4. Use Instagram and WhatsApp outreach to source visuals and early partners.</p>
          </div>
          <Link href="/register?role=shop">
            <Button fullWidth>Start partner signup</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
