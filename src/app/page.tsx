import Link from "next/link";
import {
  ArrowRight,
  Globe,
  CreditCard,
  TrendingUp,
  ArrowLeftRight,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold">W</span>
          </div>
          <span className="text-xl font-bold text-white">Wayex</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by Bridge.xyz
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
            One App.<br />
            One Card.<br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Everything Money.
            </span>
          </h1>
          <p className="text-lg text-white/60 mt-6 max-w-xl leading-relaxed">
            Get USD and EUR bank accounts from anywhere. Move money freely. 
            Earn automatically. Spend stablecoins like cash.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link href="/register">
              <Button size="lg">
                Create Account <ArrowRight className="w-4 h-4 ml-1" />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {[
            { label: "Countries", value: "160+" },
            { label: "Supported Chains", value: "10+" },
            { label: "Transaction Fee", value: "0%" },
            { label: "Merchants", value: "200M+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pb-32">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          Your money. Upgraded.
        </h2>
        <p className="text-white/50 text-center max-w-md mx-auto mb-16">
          Everything you need for global finance, in one platform.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
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
          ].map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}
              >
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Payment rails */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pb-32">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-white mb-2">Local Rails, Global Reach</h2>
          <p className="text-white/50 mb-8">Receive and send via the payment rail that works best for you.</p>
          <div className="flex flex-wrap gap-3">
            {["ACH", "Wire", "SEPA", "PIX", "SPEI", "Faster Payments", "USDC", "USDT", "USDB", "DAI", "PYUSD"].map(
              (rail) => (
                <span
                  key={rail}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70"
                >
                  {rail}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pb-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to upgrade your money?</h2>
          <p className="text-white/50 mb-8">Join users in 160+ countries who bank globally with Wayex.</p>
          <Link href="/register">
            <Button size="lg">
              Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="text-sm text-white/50">Wayex Platform</span>
          </div>
          <p className="text-xs text-white/30">
            Built with Bridge.xyz stablecoin infrastructure. Demo application.
          </p>
        </div>
      </footer>
    </div>
  );
}
