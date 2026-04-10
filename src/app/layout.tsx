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

export const metadata: Metadata = {
  title: "eBay Buyer Guardian — Seller Risk Analyzer Chrome Extension",
  description: "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension that analyzes seller feedback, account age, and reputation. 100% local, no external APIs.",
  keywords: ["eBay", "seller risk", "eBay buyer protection", "Chrome extension", "eBay safety", "seller analyzer", "eBay scam detector", "feedback checker", "online shopping safety", "browser extension"],
  authors: [{ name: "eBay Buyer Guardian" }],
  icons: {
    icon: "/logos/logo-option1.png",
  },
  openGraph: {
    title: "eBay Buyer Guardian — Seller Risk Analyzer",
    description: "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension — 100% local analysis, no external APIs.",
    url: "https://ebay-buyer-guardian.vercel.app",
    siteName: "eBay Buyer Guardian",
    type: "website",
    images: ["/logos/logo-option1.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "eBay Buyer Guardian — Seller Risk Analyzer",
    description: "Spot risky eBay sellers instantly with color-coded risk badges. Free Chrome extension.",
    images: ["/logos/logo-option1.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
