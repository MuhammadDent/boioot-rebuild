import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { AuthGateProvider } from "@/context/AuthGateContext";
import { ContentProvider } from "@/context/ContentContext";
import { SiteSettingsProvider, DEFAULT_SETTINGS, type SiteSettings } from "@/context/SiteSettingsContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import IntegrationHead from "@/components/integrations/IntegrationHead";
import IntegrationBody from "@/components/integrations/IntegrationBody";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-cairo",
  preload: false,
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "بيوت — منصة العقارات السورية",
  description: "ابحث عن شقتك أو منزلك المثالي في سوريا",
  openGraph: {
    siteName: "بيوت",
    locale: "ar_SY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@boioot_sy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ── Dev safety ────────────────────────────────────────────────────────────────
const _LAYOUT_BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
if (
  process.env.NODE_ENV !== "production" &&
  _LAYOUT_BACKEND_URL.includes("fly.dev")
) {
  throw new Error(
    `\n\n🚨 DEV SAFETY VIOLATION 🚨\n` +
    `[layout.tsx] BACKEND_URL points to production:\n` +
    `  ${_LAYOUT_BACKEND_URL}\n` +
    `Fix: set BACKEND_URL=http://localhost:8080 in .env.local\n`
  );
}

// Fetch site settings server-side so the first SSR paint reflects real DB values.
async function getInitialSiteSettings(): Promise<SiteSettings> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${backendUrl}/api/settings/public`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return DEFAULT_SETTINGS;
    return (await res.json()) as SiteSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSettings = await getInitialSiteSettings();

  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <IntegrationHead />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body suppressHydrationWarning>
        <IntegrationBody />
        <SiteSettingsProvider initialSettings={initialSettings}>
          <AuthProvider>
            <SubscriptionProvider>
              <ContentProvider>
                <AuthGateProvider>{children}</AuthGateProvider>
              </ContentProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </SiteSettingsProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
