import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/lib/providers";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/lib/theme";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { GlobalErrorCatcher } from "@/components/GlobalErrorCatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KAIROS | Private Health Management",
    template: "%s | KAIROS",
  },
  description: "Clinical-grade biometric tracking, AI-powered coaching, and personalized protocol management.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kairos.health"),
  openGraph: {
    title: "KAIROS | Private Health Management",
    description: "Clinical-grade biometric tracking, AI-powered coaching, and personalized protocol management.",
    siteName: "KAIROS Health",
    type: "website",
    locale: "en_US",
    images: [{ url: "/icons/icon-512x512.svg", width: 512, height: 512, alt: "KAIROS Health" }],
  },
  twitter: {
    card: "summary",
    title: "KAIROS | Private Health Management",
    description: "Clinical-grade biometric tracking, AI-powered coaching, and personalized protocol management.",
    images: ["/icons/icon-512x512.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KAIROS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark theme-warm-slate">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#2C2C2E" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body className="min-h-screen">
        <ClerkProvider>
          <TRPCProvider>
            <ThemeProvider>
              <ToastProvider>
                <GlobalErrorCatcher />
                <UpdateBanner />
                {children}
              </ToastProvider>
            </ThemeProvider>
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
