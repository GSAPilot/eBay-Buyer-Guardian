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
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Eye,
    title: "Instant Risk Badges",
    desc: "Color-coded badges (green/yellow/red) appear next to seller names on every eBay listing and search result — no clicks needed.",
  },
  {
    icon: SlidersHorizontal,
    title: "Customizable Rules",
    desc: "Set your own thresholds for feedback %, feedback count, and account age. The scoring adapts to your risk tolerance.",
  },
  {
    icon: History,
    title: "Seller History Dashboard",
    desc: "Every seller you encounter is logged with risk level, stats, and timestamp — searchable in the popup history tab.",
  },
  {
    icon: Lock,
    title: "100% Local & Private",
    desc: "Zero external API calls. All parsing and scoring runs in your browser. No data leaves your machine. Fewer CAPTCHAs.",
  },
  {
    icon: Zap,
    title: "Lightweight & Fast",
    desc: "Runs only on eBay pages. No background processes, no bloat. Injects a single badge — no page layout disruption.",
  },
  {
    icon: Shield,
    title: "Smart Risk Scoring",
    desc: "Combines feedback percentage, feedback count, account age, and trend analysis into a single actionable risk score.",
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
    desc: "Visit any eBay listing or search page — risk badges appear automatically next to seller names.",
  },
];

const faqs = [
  {
    q: "Does this send any data to external servers?",
    a: "No. eBay Buyer Guardian is 100% local. All parsing and risk scoring happens in your browser. No data is ever transmitted externally.",
  },
  {
    q: "Will this trigger eBay's bot detection / CAPTCHAs?",
    a: "Unlike some competitors that make extra network requests, our extension only parses what's already on the page. This significantly reduces CAPTCHA triggers.",
  },
  {
    q: "Which eBay pages does it work on?",
    a: "It works on individual listing pages (ebay.com/itm/*) and search results (ebay.com/sch/*). Badges appear automatically.",
  },
  {
    q: "Can I customize the risk thresholds?",
    a: "Yes! Click the extension icon in your toolbar to open the popup. The Rules tab lets you adjust minimum feedback %, feedback count, and account age requirements.",
  },
  {
    q: "How is the risk score calculated?",
    a: "The score combines three factors: feedback percentage, feedback count, and account age. Each factor can contribute 1–3 risk points depending on how far it deviates from your thresholds. Scores ≥5 = red, ≥2 = yellow, otherwise green.",
  },
  {
    q: "Does it work on eBay country sites (eBay UK, eBay DE, etc.)?",
    a: "Currently it matches *.ebay.com. For other country domains, the extension can be updated to support additional patterns in a future release.",
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

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
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
              v1.0.0
            </Badge>
            <a href="/ebay-buyer-guardian.zip" download>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download
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
                  100% Local · Zero External APIs
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Spot Risky eBay Sellers{" "}
                  <span className="text-green-500">Instantly</span>
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Color-coded risk badges appear right next to seller names.
                  Customizable rules, history dashboard, and zero data leaving
                  your browser.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="/ebay-buyer-guardian.zip" download>
                    <Button size="lg" className="gap-2 text-base">
                      <Download className="h-5 w-5" />
                      Download Extension
                    </Button>
                  </a>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 text-base"
                    onClick={() =>
                      document
                        .getElementById("how-it-works")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    See How It Works
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <Chrome className="h-4 w-4" />
                  Chrome &amp; Chromium browsers · Manifest V3
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-green-500/10 via-transparent to-amber-500/10 blur-2xl" />
                <img
                  src="/hero-image.png"
                  alt="eBay Buyer Guardian hero illustration"
                  className="relative rounded-2xl border border-border shadow-2xl"
                />
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
                A focused MVP that solves the real pain point — no bloat, no
                external dependencies, no extra network calls.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card
                  key={f.title}
                  className="border-border bg-card transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
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

        {/* ── HOW IT WORKS ── */}
        <section
          id="how-it-works"
          className="border-t border-border bg-muted/30"
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
                  Download eBay Buyer Guardian
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── PREVIEW ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Clean Overlay, No Clutter
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  The badge sits neatly next to the seller name on listing pages
                  and search results. Hover for a rich tooltip with full risk
                  breakdown — feedback %, count, account age, and specific
                  reasons for the rating.
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
                      Detailed tooltip on hover
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      Works on both listing &amp; search pages
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">
                      SPA navigation detection (eBay pushState)
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/10 blur-2xl" />
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
        <section className="border-t border-border bg-muted/30">
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
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:px-16">
              <Shield className="mx-auto mb-4 h-12 w-12 opacity-80" />
              <h2 className="text-3xl font-bold">
                Start Shopping Safer on eBay
              </h2>
              <p className="mx-auto mt-3 max-w-md opacity-80">
                Download eBay Buyer Guardian — it takes under a minute to
                install and starts protecting you immediately.
              </p>
              <a href="/ebay-buyer-guardian.zip" download>
                <Button
                  size="lg"
                  variant="secondary"
                  className="mt-8 gap-2 text-base"
                >
                  <Download className="h-5 w-5" />
                  Download Now — Free
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            eBay Buyer Guardian v1.0.0
          </div>
          <p className="text-xs text-muted-foreground">
            Not affiliated with eBay Inc. · 100% open-source &amp; local
          </p>
        </div>
      </footer>
    </div>
  );
}
