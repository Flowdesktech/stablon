export interface MarketingFaq {
  question: string;
  answer: string;
}

export const marketingFaqs: MarketingFaq[] = [
  {
    question: "What is Stablon?",
    answer:
      "Stablon is a business payments and invoicing application. It brings supported money accounts, bank and stablecoin payment workflows, client invoices, recurring billing, and transaction tracking into one dashboard. Payment services are provided through integrated financial infrastructure and depend on account eligibility.",
  },
  {
    question: "Can I create and send invoices with Stablon?",
    answer:
      "Yes. You can manage clients; add line items, taxes, discounts, terms, and due dates; choose from 15 invoice templates; download a PDF; email the invoice; and track draft, sent, overdue, and paid status. You can also create recurring invoice schedules.",
  },
  {
    question: "Can clients pay an invoice with stablecoins?",
    answer:
      "A client can pay through a stablecoin route when the invoice sender has completed verification and configured an eligible settlement destination. Options can include USDC or USDT on supported networks. The checkout only displays routes available for the invoice currency, account, customer jurisdiction, and current provider support.",
  },
  {
    question: "Can clients pay invoices by bank transfer?",
    answer:
      "Eligible invoice checkouts can offer bank payment instructions for routes such as ACH, wire, SEPA, or Faster Payments. Stablon creates a payment request for the invoice amount and provides the memo or reference needed to match provider updates to that invoice.",
  },
  {
    question: "Do I need identity verification to create an invoice?",
    answer:
      "No. You can draft invoices and use the PDF generator without completing identity verification. Verification is required before you enable Bridge-powered payment collection on an invoice.",
  },
  {
    question: "How do recurring invoices work?",
    answer:
      "Create a weekly, biweekly, monthly, quarterly, or yearly schedule from a saved client and invoice configuration. At each due interval, Stablon generates a new invoice with its own number and dates. Automatic email delivery can be enabled when the operator has configured Resend.",
  },
  {
    question: "Which currencies and payment networks are supported?",
    answer:
      "Invoice currencies and payment routes are limited to those made available by the integrated provider for the sender and payer. Common examples include USD through ACH or wire, EUR through SEPA, GBP through Faster Payments, and selected stablecoins on supported networks. Availability can change and varies by jurisdiction.",
  },
  {
    question: "How are invoice payments tracked?",
    answer:
      "Each checkout is tied to an invoice, amount, and configured settlement destination. Stablon verifies provider webhook updates, records the related transfer, marks a successfully completed invoice as paid, and includes the invoice reference in transaction activity.",
  },
  {
    question: "Is there a free invoice generator?",
    answer:
      "Yes. The public PDF-only invoice generator lets you create and download an invoice without an account. Generator entries are not saved and cannot collect payments.",
  },
  {
    question: "Is Stablon secure?",
    answer:
      "Stablon uses server-side authorization, protected session cookies, encrypted sensitive account values, optional two-factor authentication, unguessable public invoice links, signed payment webhook verification, and identity checks before payment collection is enabled. Users should still verify invoice and recipient details before sending money.",
  },
  {
    question: "How do I accept a USDC payment for an invoice?",
    answer:
      "Create and send the invoice, then enable payment collection using an eligible settlement destination. If USDC is available for that invoice and jurisdiction, the client can select the displayed USDC route on the secure checkout page and follow the exact network, amount, and destination instructions.",
  },
  {
    question: "How long does an invoice payment take to settle?",
    answer:
      "Settlement time depends on the payment rail, banking hours, blockchain confirmation time, compliance review, and provider processing. Stablon shows the latest provider-reported status, but it does not promise a fixed settlement time for bank or stablecoin transfers.",
  },
  {
    question: "Can Stablon email an invoice PDF to my client?",
    answer:
      "Yes. When email delivery is configured, Stablon can send the invoice message with a PDF attachment and secure public link. You can also download the PDF and deliver it yourself. Email delivery status does not guarantee that a recipient has opened the message.",
  },
  {
    question: "Does the free invoice generator save my invoice or accept payments?",
    answer:
      "No. The public generator creates a PDF in the current session without saving the invoice to your Stablon account. It does not create a payment link or track payment. Sign in to use saved clients, delivery, recurring billing, and eligible checkout features.",
  },
  {
    question: "Are there fees for bank or stablecoin invoice payments?",
    answer:
      "Fees can depend on the account, transfer route, asset, network, destination, and infrastructure provider. Review the applicable transaction details before confirming a payment or withdrawal. Stablon does not describe every route as free.",
  },
  {
    question: "Can a client make a partial invoice payment?",
    answer:
      "The generated checkout is designed around the invoice's outstanding amount rather than an arbitrary partial amount. If you agree to installments or a partial payment outside that checkout, update the invoice and your records so the remaining balance is clear.",
  },
];
