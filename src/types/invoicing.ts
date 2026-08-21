export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "payment_pending"
  | "paid"
  | "overdue"
  | "void"
  | "payment_failed"
  | "refunded";

export type InvoicePaymentStatus =
  | "unpaid"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export type RecurringFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface InvoiceAddress {
  street: string;
  street2?: string;
  city: string;
  subdivision?: string;
  postalCode: string;
  country: string;
}

export interface InvoiceSettings {
  prefix: string;
  nextNumber: number;
  taxRate: string;
  currency: string;
  paymentTerms: string;
  dueDateDuration: number;
  autoIncrementNumber: boolean;
  timezone: string;
  templateId: string;
}

export interface InvoiceSettlementSettings {
  enabled: boolean;
  destinationType: "bridge_wallet" | "address";
  bridgeWalletId?: string;
  address?: string;
  paymentRail: string;
  currency: string;
  developerFeePercent?: string;
  acceptedFiatRails: string[];
  acceptedCryptoRails: string[];
}

export interface InvoiceProfile {
  id: string;
  ownerUid: string;
  name: string;
  company: string;
  displayName: string;
  email: string;
  phone?: string;
  address: InvoiceAddress;
  logoUrl?: string;
  isDefault: boolean;
  settings: InvoiceSettings;
  settlement: InvoiceSettlementSettings;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceClient {
  id: string;
  ownerUid: string;
  profileId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address: InvoiceAddress;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
}

export interface InvoiceTotals {
  subtotal: string;
  discountType: "none" | "percent" | "fixed";
  discountValue: string;
  discountAmount: string;
  taxableAmount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
}

export interface InvoiceSenderSnapshot {
  profileId: string;
  displayName: string;
  company: string;
  email: string;
  phone?: string;
  address: InvoiceAddress;
  logoUrl?: string;
}

export interface InvoiceClientSnapshot {
  clientId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address: InvoiceAddress;
}

export interface Invoice {
  id: string;
  ownerUid: string;
  profileId: string;
  clientId: string;
  invoiceNumber: number;
  formattedNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  currency: string;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  notes: string;
  paymentTerms: string;
  templateId: string;
  senderSnapshot: InvoiceSenderSnapshot;
  clientSnapshot: InvoiceClientSnapshot;
  publicTokenHash?: string;
  publicTokenEncrypted?: string;
  publicTokenHint?: string;
  publishedAt?: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewCount: number;
  sentCount: number;
  deliveryStatus?: "not_requested" | "pending" | "sent" | "failed";
  deliveryError?: string;
  lastSentAt?: string;
  paidAt?: string;
  paymentAttemptId?: string;
  bridgeTransferId?: string;
  recurringInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePaymentAttempt {
  id: string;
  invoiceId: string;
  ownerUid: string;
  profileId: string;
  provider: "bridge";
  providerPaymentId?: string;
  idempotencyKey: string;
  sourceRail: string;
  sourceCurrency: string;
  destinationRail: string;
  destinationCurrency: string;
  amount: string;
  status: InvoicePaymentStatus;
  providerState?: string;
  depositInstructions?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RecurringInvoice {
  id: string;
  ownerUid: string;
  profileId: string;
  clientId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextGenerationDate: string;
  lastGeneratedDate?: string;
  pausedUntil?: string;
  active: boolean;
  autoSend: boolean;
  dueDateDuration: number;
  currency: string;
  lineItems: Omit<InvoiceLineItem, "amount">[];
  taxRate: string;
  discountType: InvoiceTotals["discountType"];
  discountValue: string;
  notes: string;
  paymentTerms: string;
  templateId: string;
  generatedInvoiceIds: string[];
  totalGenerated: number;
  leaseUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicInvoice {
  formattedNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  currency: string;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  notes: string;
  paymentTerms: string;
  templateId: string;
  sender: InvoiceSenderSnapshot;
  client: InvoiceClientSnapshot;
}
