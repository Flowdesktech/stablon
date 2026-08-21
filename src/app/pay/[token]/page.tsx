import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutClient } from "@/app/pay/[token]/checkout-client";
import { getPublicInvoiceCheckout } from "@/lib/invoicing/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay invoice",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function PayInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicInvoiceCheckout(token, true);
  if (!data) notFound();
  return <CheckoutClient token={token} initialData={data} />;
}
