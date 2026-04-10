import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://ebay-buyer-guardian.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "eBay Buyer Guardian — Seller Risk Analyzer Chrome Extension",
  description:
    "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension that analyzes seller feedback, account age, and reputation. 100% local, no external APIs.",
  keywords: [
    "eBay",
    "seller risk",
    "eBay buyer protection",
    "Chrome extension",
    "eBay safety",
    "seller analyzer",
    "eBay scam detector",
    "feedback checker",
    "online shopping safety",
    "browser extension",
    "how to check ebay seller reputation",
    "is this ebay seller safe",
    "ebay scam detector",
    "ebay seller verification",
    "ebay seller rating checker",
    "how to avoid ebay scams",
    "ebay seller trust score",
    "check ebay seller before buying",
    "ebay buyer safety tool",
    "ebay seller background check",
    "ebay seller feedback analyzer",
    "ebay protection extension",
    "chrome extension ebay safety",
  ],
  authors: [{ name: "eBay Buyer Guardian", url: SITE_URL }],
  creator: "eBay Buyer Guardian",
  publisher: "eBay Buyer Guardian",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logos/logo-option1.png",
    apple: "/logos/logo-option1.png",
  },
  openGraph: {
    title: "eBay Buyer Guardian — Seller Risk Analyzer",
    description:
      "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension — 100% local analysis, no external APIs.",
    url: SITE_URL,
    siteName: "eBay Buyer Guardian",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logos/logo-option1.png",
        width: 1200,
        height: 630,
        alt: "eBay Buyer Guardian — Seller Risk Analyzer Chrome Extension",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "eBay Buyer Guardian — Seller Risk Analyzer",
    description:
      "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension.",
    images: [
      {
        url: "/logos/logo-option1.png",
        width: 1200,
        height: 630,
        alt: "eBay Buyer Guardian — Seller Risk Analyzer Chrome Extension",
      },
    ],
  },
  category: "shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://lemonsqueezy.com" />
        <link rel="preconnect" href="https://ebaybuyerguardian.lemonsqueezy.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
