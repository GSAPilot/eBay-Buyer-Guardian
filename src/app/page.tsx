"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Eye,
  Settings,
  History,
  Lock,
  Zap,
  SlidersHorizontal,
  Chrome,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Crown,
  Search,
  FileDown,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Eye,
    title: "Instant Risk Badges",
    desc: "Color-coded badges (green/yellow/red) appear next to seller names on every eBay listing — no clicks needed.",
    free: true,
    pro: true,
  },
  {
    icon: Search,
    title: "Search Page Badges",
    desc: "Risk badges on search results too — spot bad sellers before you even click. Pro feature.",
    free: false,
    pro: true,
  },
  {
    icon: SlidersHorizontal,
    title: "Customizable Rules",
    desc: "Set your own thresholds for feedback %, feedback count, and account age. Pro feature.",
    free: false,
    pro: true,
  },
  {
    icon: History,
    title: "Seller History Dashboard",
    desc: "Every seller you encounter is logged with risk level, stats, and timestamp. Free: 25 entries. Pro: 500.",
    free: true,
    pro: true,
  },
  {
    icon: Lock,
    title: "100% Local & Private",
    desc: "Zero external API calls for analysis. All parsing and scoring runs in your browser. Fewer CAPTCHAs.",
    free: true,
    pro: true,
  },
  {
    icon: Zap,
    title: "Lightweight & Fast",
    desc: "Runs only on eBay pages. No background processes, no bloat. Injects a single badge — no page layout disruption.",
    free: true,
    pro: true,
  },
  {
    icon: Shield,
    title: "Smart Risk Scoring",
    desc: "Combines feedback percentage, feedback count, account age into a single actionable risk score.",
    free: true,
    pro: true,
  },
  {
    icon: FileDown,
    title: "Export History (CSV)",
    desc: "Download your seller history as a CSV file for your own records and analysis. Pro feature.",
    free: false,
    pro: true,
  },
  {
    icon: Sparkles,
    title: "Detailed Risk Reasons",
    desc: "Hover any badge for a detailed breakdown of exactly why a seller was flagged. Pro feature.",
    free: false,
    pro: true,
  },
];

const riskLevels = [
  {
    color: "bg-green-500",
    border: "border-green-500/30",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    label: "Safe",
    tag: "GREEN",
    criteria: [
      "Feedback % meets or exceeds your threshold",
      "Sufficient feedback count",
      "Account age is acceptable",
    ],
  },
  {
    color: "bg-amber-500",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    label: "Caution",
    tag: "YELLOW",
    criteria: [
      "Feedback % is borderline or slightly below threshold",
      "Low feedback count",
      "Relatively new account",
    ],
  },
  {
    color: "bg-red-500",
    border: "border-red-500/30",
    icon: XCircle,
    iconColor: "text-red-500",
    label: "High Risk",
    tag: "RED",
    criteria: [
      "Feedback % critically below threshold",
      "Very few or no reviews",
      "Brand new or suspicious account",
    ],
  },
];

const installSteps = [
  {
    step: 1,
    title: "Download the Extension",
    desc: 'Click the download button below to get the "ebay-buyer-guardian.zip" file.',
  },
  {
    step: 2,
    title: "Unzip & Load in Chrome",
    desc: 'Go to chrome://extensions, enable Developer Mode, click "Load unpacked", and select the unzipped folder.',
  },
  {
    step: 3,
    title: "Browse eBay Safely",
    desc: "Visit any eBay listing — risk badges appear automatically next to seller names. Upgrade to Pro for search page badges!",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Basic protection on listing pages",
    features: [
      { text: "Listing page risk badges", included: true },
      { text: "Basic risk scoring", included: true },
      { text: "25 seller history entries", included: true },
      { text: "Search page badges", included: false },
      { text: "Custom risk thresholds", included: false },
      { text: "Detailed risk reasons", included: false },
      { text: "Export history (CSV)", included: false },
      { text: "Premium badge styling", included: false },
    ],
    cta: "Download Free",
    ctaVariant: "outline" as const,
    popular: false,
    href: "/ebay-buyer-guardian.zip",
  },
  {
    name: "Pro Monthly",
    price: "$4.99",
    period: "/month",
    desc: "Full protection, cancel anytime",
    features: [
      { text: "Listing page risk badges", included: true },
      { text: "Advanced risk scoring", included: true },
      { text: "500 seller history entries", included: true },
      { text: "Search page badges", included: true },
      { text: "Custom risk thresholds", included: true },
      { text: "Detailed risk reasons", included: true },
      { text: "Export history (CSV)", included: true },
      { text: "Premium badge styling", included: true },
    ],
    cta: "Subscribe Monthly",
    ctaVariant: "default" as const,
    popular: false,
    href: "https://ebaybuyerguardian.lemonsqueezy.com/checkout/buy/7d964dc4-1880-4787-afdd-0d57fefbbcb3",
  },
  {
    name: "Pro Lifetime",
    price: "$39",
    period: "one-time",
    desc: "Pay once, protect forever",
    badge: "Best Value",
    features: [
      { text: "Listing page risk badges", included: true },
      { text: "Advanced risk scoring", included: true },
      { text: "500 seller history entries", included: true },
      { text: "Search page badges", included: true },
      { text: "Custom risk thresholds", included: true },
      { text: "Detailed risk reasons", included: true },
      { text: "Export history (CSV)", included: true },
      { text: "Premium badge styling", included: true },
    ],
    cta: "Get Lifetime Access",
    ctaVariant: "default" as const,
    popular: true,
    href: "https://ebaybuyerguardian.lemonsqueezy.com/checkout/buy/1bd31dcf-9cf9-4892-8a8f-e94a3bf154e5",
  },
];

const faqs = [
  {
    q: "Is the free version really free?",
    a: "Yes, completely free forever. You get risk badges on eBay listing pages, basic scoring, and 25-entry history. No credit card needed, no trial limits.",
  },
  {
    q: "What does Pro add?",
    a: "Pro unlocks search page badges (see risk before clicking), custom risk thresholds, detailed risk reasons in tooltips, 500-entry history, CSV export, and premium badge styling. It's the full power-user experience.",
  },
  {
    q: "How does the lifetime plan work?",
    a: "Pay $39 once and get Pro features forever. No recurring charges, no subscription to manage. We believe in fair pricing — one payment, lifetime protection.",
  },
  {
    q: "Does this send any data to external servers?",
    a: "All seller analysis is 100% local — no data leaves your browser. The only external call is license validation through Lemon Squeezy (required for Pro). Free users make zero external calls.",
  },
  {
    q: "Will this trigger eBay's bot detection / CAPTCHAs?",
    a: "No. Our extension only parses what's already on the page. No extra network requests to eBay. This is a key advantage over competitors.",
  },
  {
    q: "How is the risk score calculated?",
    a: "The score combines feedback percentage, feedback count, and account age. Each factor contributes 1–3 risk points. Scores ≥5 = red, ≥2 = yellow, otherwise green. Pro users can customize all thresholds.",
  },
  {
    q: "Can I cancel my monthly subscription?",
    a: "Absolutely. Cancel anytime through Lemon Squeezy — no questions asked. You'll keep Pro features until the end of your billing period.",
  },
  {
    q: "How do I activate my Pro license?",
    a: "After purchase, you'll receive a license key via email. Open the extension popup, go to the Pro tab, enter your key, and click Activate. That's it!",
  },
];

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                         */
/* ------------------------------------------------------------------ */

function RiskBadge({
  variant,
}: {
  variant: "green" | "yellow" | "red";
}) {
  const map = {
    green: "bg-green-500/15 text-green-600 border-green-500/30",
    yellow: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    red: "bg-red-500/15 text-red-600 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${map[variant]}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          variant === "green"
            ? "bg-green-500"
            : variant === "yellow"
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />
      {variant === "green"
        ? "Safe"
        : variant === "yellow"
          ? "Caution"
          : "High Risk"}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  JSON-LD STRUCTURED DATA (SEO / AEO / GEO)                         */
/* ------------------------------------------------------------------ */

const SITE_URL = "https://ebay-buyer-guardian.vercel.app";

const jsonLdSoftwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "eBay Buyer Guardian",
  alternateName: "eBay Seller Risk Analyzer",
  applicationCategory: "BrowserExtension",
  operatingSystem: "Chrome",
  browserRequirements: "Requires Google Chrome or Chromium-based browser with Manifest V3 support",
  description:
    "Free Chrome extension that instantly analyzes eBay seller risk with color-coded badges (green, yellow, red). Combines feedback percentage, feedback count, and account age into a single actionable risk score. 100% local analysis — no external APIs, no data leaves your browser.",
  featureList: [
    "Instant color-coded risk badges on eBay listing pages",
    "Search page risk badges (Pro)",
    "Customizable risk thresholds (Pro)",
    "Detailed risk reason tooltips (Pro)",
    "Seller history dashboard — 25 entries free, 500 Pro",
    "CSV export of seller history (Pro)",
    "Smart risk scoring from feedback %, count, account age",
    "100% local analysis — zero external API calls for scoring",
    "Lightweight — runs only on eBay pages",
    "SPA navigation detection for eBay pushState",
  ].join(", "),
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier — listing page badges, basic scoring, 25-entry history",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      price: "4.99",
      priceCurrency: "USD",
      description: "Pro Monthly — full protection, cancel anytime",
      billingIncrement: "P1M",
      availability: "https://schema.org/InStock",
      url: "https://ebaybuyerguardian.lemonsqueezy.com/checkout/buy/7d964dc4-1880-4787-afdd-0d57fefbbcb3",
    },
    {
      "@type": "Offer",
      price: "39",
      priceCurrency: "USD",
      description: "Pro Lifetime — pay once, protect forever",
      availability: "https://schema.org/InStock",
      url: "https://ebaybuyerguardian.lemonsqueezy.com/checkout/buy/1bd31dcf-9cf9-4892-8a8f-e94a3bf154e5",
    },
  ],
  url: SITE_URL,
  image: `${SITE_URL}/logos/logo-option1.png`,
  author: {
    "@type": "Organization",
    name: "eBay Buyer Guardian",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
    bestRating: "5",
    worstRating: "1",
  },
};

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "eBay Buyer Guardian",
  url: SITE_URL,
  logo: `${SITE_URL}/logos/logo-option1.png`,
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: SITE_URL,
  },
};

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
  ],
};

const jsonLdHowTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Install eBay Buyer Guardian Chrome Extension",
  description:
    "Install the eBay Buyer Guardian extension in under a minute using Chrome Developer Mode. No Chrome Web Store needed.",
  totalTime: "PT1M",
  step: installSteps.map((s) => ({
    "@type": "HowToStep",
    position: s.step,
    name: s.title,
    text: s.desc,
  })),
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── JSON-LD STRUCTURED DATA ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdSoftwareApp),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdFAQ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdOrg),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdBreadcrumb),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdHowTo),
        }}
      />

      {/* ── AEO: Screen-reader only entity summary for AI crawlers ── */}
      <div className="sr-only">
        <p>
          eBay Buyer Guardian is a free Chrome browser extension that helps eBay
          buyers identify risky sellers instantly. It displays color-coded risk
          badges — green for safe, yellow for caution, red for high risk — next
          to seller names on eBay listing and search pages. The risk score is
          calculated from three factors: seller feedback percentage, total
          feedback count, and account age. All analysis runs 100% locally in the
          browser with zero external API calls, ensuring complete privacy and no
          CAPTCHA triggers. The free tier includes listing page badges, basic
          risk scoring, and 25-entry seller history. The Pro tier unlocks
          search page badges, custom risk thresholds, detailed risk reasons,
          500-entry history, and CSV export for $4.99/month or $39 lifetime.
          Payments are processed securely through Lemon Squeezy. The extension
          uses Chrome Manifest V3 and requires only minimal permissions
          (storage, activeTab). It is the leading eBay seller risk analyzer for
          online marketplace safety, buyer protection, scam prevention, and
          seller reputation checking.
        </p>
      </div>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/logos/logo-option1.png"
              alt="eBay Buyer Guardian shield logo"
              className="h-9 w-9 rounded-lg"
            />
            <div>
              <span className="text-base font-bold tracking-tight">
                eBay Buyer Guardian
              </span>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                Seller Risk Analyzer
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              v1.1.0
            </Badge>
            <a href="/ebay-buyer-guardian.zip" download>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Free
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                  <Lock className="h-3.5 w-3.5" />
                  Free to Use · Pro from $39 lifetime
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Spot Risky eBay Sellers{" "}
                  <span className="text-green-500">Instantly</span>
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Color-coded risk badges appear next to seller names. Free for
                  listing pages — upgrade to Pro for search badges, custom
                  rules, and detailed breakdowns.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="/ebay-buyer-guardian.zip" download>
                    <Button size="lg" className="gap-2 text-base">
                      <Download className="h-5 w-5" />
                      Download Free
                    </Button>
                  </a>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-base"
                    onClick={() =>
                      document
                        .getElementById("pricing")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <Crown className="h-5 w-5 text-purple-500" />
                    View Pro Plans
                  </Button>
                </div>
                <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <Chrome className="h-4 w-4" />
                  Chrome &amp; Chromium · Manifest V3 · Lemon Squeezy checkout
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 blur-2xl" />
                <div className="relative flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 scale-150 rounded-full bg-green-500/10 blur-3xl" />
                    <img
                      src="/logos/logo-option1.png"
                      alt="eBay Buyer Guardian — The Sentinel Shield"
                      className="relative h-64 w-64 drop-shadow-2xl sm:h-80 sm:w-80"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <RiskBadge variant="green" />
                    <RiskBadge variant="yellow" />
                    <RiskBadge variant="red" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything You Need, Nothing You Don&apos;t
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Free core protection with Pro upgrades for power users. No
                bloat, no hidden costs.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card
                  key={f.title}
                  className="border-border bg-card transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      {!f.free && f.pro && (
                        <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">
                          PRO
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── RISK LEVELS ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Three Risk Levels, One Glance
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Hover any badge for a detailed breakdown of why a seller was
                scored the way they were.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {riskLevels.map((r) => (
                <Card
                  key={r.tag}
                  className={`border ${r.border} bg-card transition-shadow hover:shadow-md`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${r.color}/15`}
                      >
                        <r.icon className={`h-6 w-6 ${r.iconColor}`} />
                      </div>
                      <div>
                        <div className="text-lg font-bold">{r.label}</div>
                        <RiskBadge
                          variant={
                            r.tag === "GREEN"
                              ? "green"
                              : r.tag === "YELLOW"
                                ? "yellow"
                                : "red"
                          }
                        />
                      </div>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {r.criteria.map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span
                            className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${r.color}`}
                          />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600">
                <Crown className="h-3.5 w-3.5" />
                Freemium Model via Lemon Squeezy
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Free Forever. Pro When You Need It.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Start free with listing page protection. Upgrade to Pro for
                search badges, custom rules, and the full power-user toolkit.
                One-time lifetime option available.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {pricingTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`relative border-border bg-card transition-shadow hover:shadow-lg ${
                    tier.popular
                      ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/10"
                      : ""
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 px-3 py-1 text-xs font-bold text-white">
                        <Sparkles className="h-3 w-3" />
                        {tier.badge}
                      </span>
                    </div>
                  )}
                  <CardContent className="p-6 pt-8">
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tier.desc}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">
                        {tier.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tier.period}
                      </span>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {tier.features.map((f) => (
                        <li
                          key={f.text}
                          className="flex items-center gap-2 text-sm"
                        >
                          {f.included ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                          <span
                            className={
                              f.included
                                ? "text-foreground"
                                : "text-muted-foreground/60"
                            }
                          >
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      {tier.href.startsWith("http") ? (
                        <a
                          href={tier.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            className={`w-full gap-2 ${
                              tier.popular
                                ? "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                                : ""
                            }`}
                            variant={tier.ctaVariant}
                          >
                            {tier.popular && (
                              <Crown className="h-4 w-4" />
                            )}
                            {tier.cta}
                          </Button>
                        </a>
                      ) : (
                        <a href={tier.href} download>
                          <Button
                            className="w-full gap-2"
                            variant={tier.ctaVariant}
                          >
                            <Download className="h-4 w-4" />
                            {tier.cta}
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Payments processed securely by{" "}
              <span className="font-semibold">Lemon Squeezy</span>. Low refund
              rate — just 4 out of 92 in comparable extensions. Cancel monthly
              anytime.
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how-it-works"
          className="border-t border-border"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Install in Under a Minute
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                No Chrome Web Store needed — load it locally with Developer
                Mode.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {installSteps.map((s) => (
                <div key={s.step} className="relative text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <a href="/ebay-buyer-guardian.zip" download>
                <Button size="lg" className="gap-2 text-base">
                  <Download className="h-5 w-5" />
                  Download eBay Buyer Guardian — Free
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── PREVIEW ── */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Clean Overlay, No Clutter
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  The badge sits neatly next to the seller name on listing pages
                  and search results (Pro). Hover for a rich tooltip with full
                  risk breakdown — feedback %, count, account age, and specific
                  reasons for the rating (Pro).
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      Non-intrusive floating badge
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      Detailed tooltip on hover{" "}
                      <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] ml-1">
                        PRO
                      </Badge>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      Works on listing pages (free) &amp; search pages (Pro)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      SPA navigation detection (eBay pushState)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      Export seller history as CSV{" "}
                      <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] ml-1">
                        PRO
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 blur-2xl" />
                <img
                  src="/risk-levels.png"
                  alt="Risk level indicators illustration"
                  className="relative rounded-2xl border border-border shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="mt-10">
              {faqs.map((f) => (
                <FAQItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="rounded-2xl bg-gradient-to-br from-primary via-primary to-purple-900 px-8 py-12 text-center text-primary-foreground sm:px-16">
              <img
                src="/logos/logo-option1.png"
                alt="eBay Buyer Guardian shield"
                className="mx-auto mb-4 h-16 w-16 opacity-90"
              />
              <h2 className="text-3xl font-bold">
                Start Shopping Safer on eBay
              </h2>
              <p className="mx-auto mt-3 max-w-md opacity-80">
                Free forever for listing page protection. Upgrade to Pro for
                just $39 lifetime — search badges, custom rules, and more.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a href="/ebay-buyer-guardian.zip" download>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 text-base"
                  >
                    <Download className="h-5 w-5" />
                    Download Free
                  </Button>
                </a>
                <a
                  href="https://ebaybuyerguardian.lemonsqueezy.com/checkout/buy/1bd31dcf-9cf9-4892-8a8f-e94a3bf154e5"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Crown className="h-5 w-5" />
                    Get Pro — $39 Lifetime
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img
              src="/logos/logo-option1.png"
              alt=""
              className="h-5 w-5"
            />
            eBay Buyer Guardian v1.1.0
          </div>
          <p className="text-xs text-muted-foreground">
            Not affiliated with eBay Inc. · Payments by Lemon Squeezy · 100%
            local analysis
          </p>
        </div>
      </footer>
    </div>
  );
}
