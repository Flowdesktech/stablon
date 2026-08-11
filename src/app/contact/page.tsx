import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Contact us — ${siteConfig.name}`,
  description: "Get in touch with the Stablon team. Questions, feedback, or support — we reply by email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/5">
        <nav className="flex items-center justify-between px-6 lg:px-12 py-5 max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold text-white">Stablon</span>
          </Link>
        </nav>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <h1 className="text-4xl font-bold text-white mb-3">Contact us</h1>
        <p className="text-white/50 mb-10 max-w-xl">
          Whether you're exploring Stablon or already using it, we're here to help.
        </p>
        <ContactForm />
      </main>
    </div>
  );
}
