import "server-only";
import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Invoice } from "@/types/invoicing";
import { safeInvoiceFilename } from "@/lib/invoicing/renderable";

let resendClient: Resend | null = null;

export class InvoiceEmailConfigurationError extends Error {}

function getResend(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new InvoiceEmailConfigurationError("Invoice email is not configured");
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

function invoiceFromAddress(): string {
  const from = process.env.INVOICE_FROM_EMAIL;
  if (!from) {
    throw new InvoiceEmailConfigurationError("Invoice sender address is not configured");
  }
  return from;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function invoiceDeliveryKey(invoice: Invoice): string {
  return `invoice-${invoice.id}-${(invoice.sentCount || 0) + 1}`;
}

export async function sendInvoiceEmail({
  invoice,
  pdf,
  paymentUrl,
  deliveryKey,
}: {
  invoice: Invoice;
  pdf: Buffer;
  paymentUrl: string;
  deliveryKey: string;
}): Promise<string> {
  const sender = invoice.senderSnapshot.company || invoice.senderSnapshot.displayName;
  const recipient = invoice.clientSnapshot.name;
  const subject = `Invoice ${invoice.formattedNumber} from ${sender}`;
  const total = `${invoice.currency} ${invoice.totals.total}`;

  const { data, error } = await getResend().emails.send(
    {
      from: invoiceFromAddress(),
      to: [invoice.clientSnapshot.email],
      replyTo: invoice.senderSnapshot.email,
      subject,
      text: [
        `Hello ${recipient},`,
        "",
        `${sender} sent you invoice ${invoice.formattedNumber} for ${total}.`,
        `View and pay: ${paymentUrl}`,
        "",
        "A PDF copy is attached.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:600px">
          <p>Hello ${escapeHtml(recipient)},</p>
          <p><strong>${escapeHtml(sender)}</strong> sent you invoice
            <strong>${escapeHtml(invoice.formattedNumber)}</strong> for
            <strong>${escapeHtml(total)}</strong>.</p>
          <p>
            <a href="${escapeHtml(paymentUrl)}"
              style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">
              View and pay invoice
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">A PDF copy is attached. Reply to this email to contact the sender.</p>
        </div>
      `,
      attachments: [
        {
          filename: safeInvoiceFilename(invoice.formattedNumber),
          content: pdf,
          contentType: "application/pdf",
        },
      ],
      tags: [{ name: "invoice_id", value: invoice.id }],
    },
    { idempotencyKey: deliveryKey }
  );

  if (error) {
    throw new Error(`Email provider rejected the invoice: ${error.message}`);
  }
  return data.id;
}

export async function markInvoiceSent(
  ownerUid: string,
  invoiceId: string,
  deliveryKey: string,
  providerMessageId: string
): Promise<void> {
  const ref = getAdminDb().collection("invoices").doc(invoiceId);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as (Invoice & { lastSentDeliveryKey?: string }) | undefined;
    if (!data || data.ownerUid !== ownerUid) throw new Error("Invoice not found");
    if (data.lastSentDeliveryKey === deliveryKey) return;

    const timestamp = new Date().toISOString();
    transaction.update(ref, {
      sentCount: (data.sentCount || 0) + 1,
      lastSentAt: timestamp,
      updatedAt: timestamp,
      lastSentDeliveryKey: deliveryKey,
      lastEmailMessageId: providerMessageId,
    });
  });
}
