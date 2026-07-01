import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  CreditCard,
  TrendingUp,
  ArrowLeftRight,
  Shield,
  Zap,
  UserPlus,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const features = [
  {
    icon: Globe,
    title: "Global Accounts",
    desc: "Open USD and EUR accounts instantly. Receive via ACH, Wire, SEPA, PIX, SPEI, and Faster Payments.",
    gradient: "from-purple-500 to-purple-700",
  },
  {
    icon: ArrowLeftRight,
    title: "On & Off Ramp",
    desc: "Deposit fiat or stablecoins. Cash out to your bank account via local rails worldwide.",
    gradient: "from-blue-500 to-blue-700",
  },
  {
    icon: CreditCard,
    title: "Visa Card",
    desc: "Spend stablecoins like cash at 200M+ merchants. Apple Pay and Google Pay supported.",
    gradient: "from-indigo-500 to-indigo-700",
  },
  {
    icon: ArrowLeftRight,
    title: "Instant Swap",
    desc: "Convert crypto to stablecoins automatically. One-tap conversions, no complexity.",
    gradient: "from-cyan-500 to-cyan-700",
  },
  {
    icon: TrendingUp,
    title: "Earn Yield",
    desc: "Up to 5% APY on your stablecoin balance. Updated in real time, no lock-ups.",
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    desc: "Bank-grade encryption, 24/7 monitoring, and full KYC/KYB compliance built in.",
    gradient: "from-amber-500 to-amber-700",
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    desc: "Sign up with your email in under a minute — no branch visit, no paperwork.",
  },
  {
    icon: BadgeCheck,
    title: "Verify your identity",
    desc: "Complete a quick, secure KYC check to unlock USD and EUR accounts.",
  },
  {
    icon: Wallet,
    title: "Move, spend & earn",
    desc: "Deposit funds, spend with your Visa card, swap instantly, and earn yield automatically.",
  },
];

const faqs = [
  {
    q: "What is Stablon?",
    a: "Stablon is a global money app built on stablecoin infrastructure. It lets you open USD and EUR accounts, move money by bank transfer or on-chain, spend with a Visa card, swap between assets, and earn yield — all from one place.",
  },
  {
    q: "Which countries and currencies are supported?",
    a: "Stablon is available to users in 160+ countries. You can hold USD and EUR balances and receive funds via ACH, Wire, SEPA, PIX, SPEI, and Faster Payments, plus on-chain stablecoins like USDC, USDT, and DAI.",
  },
  {
    q: "How do I add or withdraw money?",
    a: "Deposit fiat through local bank rails or send stablecoins to your wallet. When you want to cash out, withdraw to your linked bank account through the same local rails, worldwide.",
  },
  {
    q: "What is the Stablon Visa card?",
    a: "It's a card that lets you spend your stablecoin balance like cash at over 200 million merchants, with Apple Pay and Google Pay support.",
  },
  {
    q: "How does earning yield work?",
    a: "Your eligible stablecoin balance can earn up to 5% APY. Yield accrues in real time with no lock-ups, so your funds stay available whenever you need them.",
  },
  {
    q: "Is Stablon secure?",
    a: "Yes. Stablon uses bank-grade encryption, optional two-factor authentication, 24/7 monitoring, and full KYC/KYB compliance to protect your account and funds.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteConfig.name,
      url: siteUrl,
      description: siteConfig.description,
      logo: `${siteUrl}/icon`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      name: siteConfig.name,
      url: siteUrl,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web, iOS, Android",
      description: siteConfig.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden">
      <script
        type="application/ld+json"
        // Structured data for search engines (Organization, WebSite, WebApplication, FAQ).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="relative z-10">
        <nav
          aria-label="Primary"
          className="flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto"
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Stablon home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold" aria-hidden="true">
                S
              </span>
            </div>
            <span className="text-xl font-bold text-white">Stablon</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-32">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Powered by Bridge.xyz
            </p>
            <h1
              id="hero-heading"
              className="text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight"
            >
              One App.
              <br />
              One Card.
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Everything Money.
              </span>
            </h1>
            <p className="text-lg text-white/60 mt-6 max-w-xl leading-relaxed">
              Get USD and EUR bank accounts from anywhere. Move money freely, earn automatically, and
              spend stablecoins like cash — all from one secure app.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/register">
                <Button size="lg">
                  Create Account <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {[
              { label: "Countries", value: "160+" },
              { label: "Supported Chains", value: "10+" },
              { label: "Transaction Fee", value: "0%" },
              { label: "Merchants", value: "200M+" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse text-center">
                <dt className="text-sm text-white/50 mt-1">{stat.label}</dt>
                <dd className="text-3xl font-bold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="max-w-7xl mx-auto px-6 lg:px-12 pb-32">
          <h2 id="features-heading" className="text-3xl font-bold text-white text-center mb-4">
            Your money. Upgraded.
          </h2>
          <p className="text-white/50 text-center max-w-md mx-auto mb-16">
            Everything you need for global finance, in one platform.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <article
                key={f.title}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}
                >
                  <f.icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="max-w-7xl mx-auto px-6 lg:px-12 pb-32">
          <h2 id="how-heading" className="text-3xl font-bold text-white text-center mb-4">
            Get started in three steps
          </h2>
          <p className="text-white/50 text-center max-w-md mx-auto mb-16">
            From sign-up to spending in minutes — no branch visits, no paperwork.
          </p>
          <ol className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-white/40">Step {i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Payment rails */}
        <section aria-labelledby="rails-heading" className="max-w-7xl mx-auto px-6 lg:px-12 pb-32">
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 lg:p-12">
            <h2 id="rails-heading" className="text-2xl font-bold text-white mb-2">
              Local Rails, Global Reach
            </h2>
            <p className="text-white/50 mb-8">
              Receive and send via the payment rail that works best for you.
            </p>
            <ul className="flex flex-wrap gap-3">
              {[
                "ACH",
                "Wire",
                "SEPA",
                "PIX",
                "SPEI",
                "Faster Payments",
                "USDC",
                "USDT",
                "USDB",
                "DAI",
                "PYUSD",
              ].map((rail) => (
                <li
                  key={rail}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70"
                >
                  {rail}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto px-6 lg:px-12 pb-32">
          <h2 id="faq-heading" className="text-3xl font-bold text-white text-center mb-4">
            Frequently asked questions
          </h2>
          <p className="text-white/50 text-center mb-12">
            Everything you need to know about banking with Stablon.
          </p>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-white font-medium">
                  {faq.q}
                  <ArrowRight
                    className="w-4 h-4 text-white/40 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="text-sm text-white/50 leading-relaxed mt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-heading" className="max-w-7xl mx-auto px-6 lg:px-12 pb-20">
          <div className="text-center">
            <h2 id="cta-heading" className="text-3xl font-bold text-white mb-4">
              Ready to upgrade your money?
            </h2>
            <p className="text-white/50 mb-8">
              Join users in 160+ countries who bank globally with Stablon.
            </p>
            <Link href="/register">
              <Button size="lg">
                Get Started Free <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs" aria-hidden="true">
                S
              </span>
            </div>
            <span className="text-sm text-white/50">Stablon Platform</span>
          </div>
          <p className="text-xs text-white/30">
            Built with Bridge.xyz stablecoin infrastructure. Demo application.
          </p>
        </div>
      </footer>
    </div>
  );
}
