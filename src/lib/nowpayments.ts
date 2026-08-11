import { createHmac, timingSafeEqual } from "crypto";

const API_URL = "https://api.nowpayments.io/v1";
const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

export class NowPaymentsError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, rawText: string) {
    super(`NOWPayments API ${status}: ${rawText}`);
    this.name = "NowPaymentsError";
    this.status = status;
    this.body = body;
  }
}

export interface CreateInvoiceParams {
  priceAmount: string;
  priceCurrency: string;
  orderId: string;
  orderDescription?: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export interface NowPaymentsInvoice {
  id: string;
  invoice_url: string;
}

// Creates a hosted invoice. NOWPayments renders the checkout UI and redirects
// the user back to successUrl / cancelUrl; payment status arrives via IPN.
export async function createInvoice(
  params: CreateInvoiceParams
): Promise<NowPaymentsInvoice> {
  const res = await fetch(`${API_URL}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ipn_callback_url: params.ipnCallbackUrl,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new NowPaymentsError(res.status, body, text);
  }
  return body as NowPaymentsInvoice;
}

// Verifies an IPN webhook signature. NOWPayments signs the JSON body with keys
// sorted alphabetically, HMAC-SHA512 keyed by the IPN secret, hex-encoded, and
// sent in the `x-nowpayments-sig` header.
export function verifyIpnSignature(
  payload: Record<string, unknown>,
  signature: string | null
): boolean {
  if (!IPN_SECRET || !signature) return false;
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  const expected = createHmac("sha512", IPN_SECRET).update(sorted).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
