import { describe, expect, it } from "vitest";
import {
  buildInvoiceTransferRequest,
  paymentRailChoices,
} from "./payments";
import type { Invoice, InvoiceProfile } from "@/types/invoicing";

const address = {
  street: "1 Main Street",
  city: "New York",
  postalCode: "10001",
  country: "USA",
};

const profile: InvoiceProfile = {
  id: "profile-1",
  ownerUid: "user-1",
  name: "Default",
  company: "Example Inc.",
  displayName: "Example",
  email: "billing@example.com",
  address,
  isDefault: true,
  settings: {
    prefix: "INV",
    nextNumber: 2,
    taxRate: "0",
    currency: "USD",
    paymentTerms: "Due on receipt",
    dueDateDuration: 7,
    autoIncrementNumber: true,
    timezone: "UTC",
    templateId: "modern-blue",
  },
  settlement: {
    enabled: true,
    destinationType: "address",
    address: "0x1111111111111111111111111111111111111111",
    paymentRail: "base",
    currency: "usdc",
    developerFeePercent: "1",
    acceptedFiatRails: ["ach_push", "unsupported_legacy_rail"],
    acceptedCryptoRails: ["ethereum", "tron"],
  },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const invoice: Invoice = {
  id: "invoice-1",
  ownerUid: "user-1",
  profileId: "profile-1",
  clientId: "client-1",
  invoiceNumber: 1,
  formattedNumber: "INV-00001",
  issueDate: "2026-08-01",
  dueDate: "2026-08-08",
  status: "sent",
  paymentStatus: "unpaid",
  currency: "USD",
  lineItems: [
    {
      id: "line-1",
      description: "Consulting",
      quantity: "1",
      rate: "125.25",
      amount: "125.25",
    },
  ],
  totals: {
    subtotal: "125.25",
    discountType: "none",
    discountValue: "0",
    discountAmount: "0.00",
    taxableAmount: "125.25",
    taxRate: "0",
    taxAmount: "0.00",
    total: "125.25",
  },
  notes: "",
  paymentTerms: "Due on receipt",
  templateId: "modern-blue",
  senderSnapshot: {
    profileId: "profile-1",
    displayName: "Example",
    company: "Example Inc.",
    email: "billing@example.com",
    address,
  },
  clientSnapshot: {
    clientId: "client-1",
    name: "Client",
    email: "client@example.com",
    address,
  },
  publicTokenHash: "hash",
  publishedAt: "2026-08-01T00:00:00.000Z",
  viewCount: 0,
  sentCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("invoice Bridge checkout locking", () => {
  it("derives rails from server-owned settings and omits unsupported rails", () => {
    const rails = paymentRailChoices(invoice, profile);
    expect(rails.map((rail) => rail.rail)).toEqual(["ach_push", "ethereum", "tron"]);
  });

  it("locks amount, issuer, fee and destination to persisted invoice settings", () => {
    const rail = paymentRailChoices(invoice, profile)[0];
    const request = buildInvoiceTransferRequest(
      invoice,
      profile,
      "customer_issuer",
      rail
    );

    expect(request).toEqual({
      amount: "125.25",
      on_behalf_of: "customer_issuer",
      developer_fee_percent: "1",
      source: { payment_rail: "ach_push", currency: "usd" },
      destination: {
        payment_rail: "base",
        currency: "usdc",
        to_address: "0x1111111111111111111111111111111111111111",
      },
    });
  });
});
