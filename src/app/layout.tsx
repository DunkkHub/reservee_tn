import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cairo, Inter, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { getCurrentSession } from "@/lib/auth-session";
import {
  LOCALE_COOKIE_NAME,
  getLocaleDirection,
  resolveAppLocale,
} from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Reservee TN",
    template: "%s | Reservee TN",
  },
  description:
    "The modern booking platform for beauty businesses in Tunisia.",
  applicationName: "Reservee TN",
  appleWebApp: {
    capable: true,
    title: "Reservee TN",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
  },
  openGraph: {
    title: "Reservee TN",
    description:
      "Discover and book trusted salons, barbers, spas, beauty centers and nail studios across Tunisia.",
    siteName: "Reservee TN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reservee TN",
    description:
      "A mobile-first premium beauty booking PWA for Tunisia.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = resolveAppLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
  );
  const initialSession = await getCurrentSession();

  return (
    <html
      lang={initialLocale}
      dir={getLocaleDirection(initialLocale)}
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${manrope.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <AppProviders
          initialLocale={initialLocale}
          initialSession={initialSession}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
