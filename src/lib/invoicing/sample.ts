import type { RenderableInvoice } from "@/lib/invoicing/renderable";

export function sampleRenderableInvoice(templateId: string): RenderableInvoice {
  return {
    formattedNumber: "INV-0042",
    issueDate: "2026-08-20",
    dueDate: "2026-09-03",
    currency: "USD",
    lineItems: [
      {
        id: "sample-strategy",
        description: "Brand strategy and visual direction",
        quantity: "1",
        rate: "1800.00",
        amount: "1800.00",
      },
      {
        id: "sample-design",
        description: "Website design",
        quantity: "24",
        rate: "125.00",
        amount: "3000.00",
      },
    ],
    totals: {
      subtotal: "4800.00",
      discountType: "percent",
      discountValue: "5",
      discountAmount: "240.00",
      taxableAmount: "4560.00",
      taxRate: "8.25",
      taxAmount: "376.20",
      total: "4936.20",
    },
    notes: "Thank you for your business. Please include the invoice number with your payment.",
    paymentTerms: "Due within 14 days",
    templateId,
    sender: {
      profileId: "sample-profile",
      displayName: "Jordan Lee",
      company: "Northstar Studio",
      email: "billing@northstar.example",
      phone: "+1 415 555 0142",
      address: {
        street: "500 Market Street",
        city: "San Francisco",
        subdivision: "CA",
        postalCode: "94105",
        country: "United States",
      },
    },
    client: {
      clientId: "sample-client",
      name: "Alex Morgan",
      company: "Summit Labs",
      email: "finance@summit.example",
      address: {
        street: "120 Broadway",
        city: "New York",
        subdivision: "NY",
        postalCode: "10005",
        country: "United States",
      },
    },
  };
}
