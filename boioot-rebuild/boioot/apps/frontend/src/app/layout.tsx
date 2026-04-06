import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { AuthGateProvider } from "@/context/AuthGateContext";
import { ContentProvider } from "@/context/ContentContext";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-cairo",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SubscriptionProvider>
            <ContentProvider>
              <AuthGateProvider>{children}</AuthGateProvider>
            </ContentProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
