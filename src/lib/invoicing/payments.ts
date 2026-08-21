import { createHash, randomUUID } from "crypto";
import Decimal from "decimal.js";
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  BridgeError,
  createTransfer,
  getTransfer,
  type BridgeTransferCreateInput,
} from "@/lib/bridge";
import {
  getInvoiceByPublicToken,
  publicInvoiceProjection,
  settlementReady,
} from "@/lib/invoicing/repository";
import { moneyString } from "@/lib/invoicing/money";
import type {
  Invoice,
  InvoicePaymentAttempt,
  InvoicePaymentStatus,
  InvoiceProfile,
  InvoiceStatus,
  PublicInvoice,
} from "@/types/invoicing";
import type { BridgeTransfer } from "@/types/bridge";

const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_LIMIT = 8;
const ACTIVE_ATTEMPT_STATUSES = new Set<InvoicePaymentStatus>([
  "unpaid",
  "pending",
  "processing",
]);
const PAYABLE_INVOICE_STATUSES = new Set<InvoiceStatus>([
  "sent",
  "viewed",
  "overdue",
  "payment_pending",
  "payment_failed",
]);

const FIAT_RAIL_CURRENCIES: Record<string, string> = {
  ach_push: "usd",
  fednow: "usd",
  wire: "usd",
  sepa: "eur",
  faster_payments: "gbp",
};

const STABLECOIN_SOURCES: Record<string, Partial<Record<string, string>>> = {
  arbitrum: { USD: "usdc" },
  avalanche_c_chain: { USD: "usdc" },
  base: { USD: "usdc", EUR: "eurc" },
  ethereum: { USD: "usdc", EUR: "eurc" },
  optimism: { USD: "usdc" },
  polygon: { USD: "usdc" },
  solana: { USD: "usdc", EUR: "eurc" },
  tron: { USD: "usdt" },
};

const INSTRUCTION_KEYS = [
  "amount",
  "currency",
  "payment_rail",
  "payment_rails",
  "bank_name",
  "bank_address",
  "bank_account_number",
  "bank_routing_number",
  "bank_beneficiary_name",
  "bank_beneficiary_address",
  "account_holder_name",
  "account_number",
  "routing_number",
  "sort_code",
  "iban",
  "bic",
  "deposit_message",
  "from_address",
  "to_address",
  "blockchain_memo",
] as const;

export interface PublicPaymentRail {
  rail: string;
  currency: string;
  kind: "bank" | "stablecoin";
  label: string;
}

export interface PublicPaymentState {
  status: InvoicePaymentStatus;
  providerState?: string;
  amount: string;
  sourceRail: string;
  sourceCurrency: string;
  depositInstructions?: Record<string, string | string[]>;
  updatedAt: string;
}

export interface PublicInvoiceCheckout {
  invoice: PublicInvoice;
  rails: PublicPaymentRail[];
  checkoutAvailable: boolean;
  availabilityMessage?: string;
  payment: PublicPaymentState | null;
}

interface StoredPaymentAttempt extends InvoicePaymentAttempt {
  providerRequest: BridgeTransferCreateInput;
  providerUpdatedAt?: string;
}

interface BridgeWebhookEvent {
  event_id: string;
  event_type: string;
  event_category?: string;
  event_created_at?: string;
  event_object: Record<string, unknown>;
}

export class InvoicePaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InvoicePaymentError";
    this.status = status;
  }
}

function db() {
  return getAdminDb();
}

function now(): string {
  return new Date().toISOString();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function railLabel(rail: string): string {
  const labels: Record<string, string> = {
    ach_push: "ACH bank transfer",
    fednow: "FedNow",
    wire: "Wire transfer",
    sepa: "SEPA bank transfer",
    faster_payments: "Faster Payments",
    avalanche_c_chain: "Avalanche",
  };
  return labels[rail] ?? rail.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPayable(invoice: Invoice): boolean {
  return (
    Boolean(invoice.publishedAt && invoice.publicTokenHash) &&
    PAYABLE_INVOICE_STATUSES.has(invoice.status) &&
    !["paid", "refunded"].includes(invoice.paymentStatus)
  );
}

function exactInvoiceAmount(invoice: Invoice): string {
  let amount: Decimal;
  try {
    amount = new Decimal(invoice.totals.total);
  } catch {
    throw new InvoicePaymentError("Invoice amount is invalid", 409);
  }
  if (!amount.isFinite() || amount.lte(0)) {
    throw new InvoicePaymentError("Invoice amount must be greater than zero", 409);
  }
  return moneyString(amount, invoice.currency);
}

export function paymentRailChoices(
  invoice: Invoice,
  profile: InvoiceProfile
): PublicPaymentRail[] {
  const currency = invoice.currency.toUpperCase();
  const choices: PublicPaymentRail[] = [];
  const seen = new Set<string>();

  for (const rail of profile.settlement.acceptedFiatRails) {
    const normalized = rail.toLowerCase();
    const sourceCurrency = FIAT_RAIL_CURRENCIES[normalized];
    if (!sourceCurrency || sourceCurrency !== currency.toLowerCase() || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    choices.push({
      rail: normalized,
      currency: sourceCurrency,
      kind: "bank",
      label: railLabel(normalized),
    });
  }

  for (const rail of profile.settlement.acceptedCryptoRails) {
    const normalized = rail.toLowerCase();
    const sourceCurrency = STABLECOIN_SOURCES[normalized]?.[currency];
    if (!sourceCurrency || seen.has(normalized)) continue;
    seen.add(normalized);
    choices.push({
      rail: normalized,
      currency: sourceCurrency,
      kind: "stablecoin",
      label: `${sourceCurrency.toUpperCase()} on ${railLabel(normalized)}`,
    });
  }

  return choices;
}

function sanitizeInstructions(
  instructions: BridgeTransfer["source_deposit_instructions"] | Record<string, unknown> | undefined
): Record<string, string | string[]> | undefined {
  if (!instructions || typeof instructions !== "object") return undefined;
  const clean: Record<string, string | string[]> = {};
  for (const key of INSTRUCTION_KEYS) {
    const value = instructions[key];
    if (typeof value === "string" || typeof value === "number") {
      clean[key] = String(value);
    } else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function publicPayment(attempt: StoredPaymentAttempt | null): PublicPaymentState | null {
  if (!attempt) return null;
  return {
    status: attempt.status,
    providerState: attempt.providerState,
    amount: attempt.amount,
    sourceRail: attempt.sourceRail,
    sourceCurrency: attempt.sourceCurrency,
    depositInstructions: sanitizeInstructions(attempt.depositInstructions),
    updatedAt: attempt.updatedAt,
  };
}

async function loadAttempt(invoice: Invoice): Promise<StoredPaymentAttempt | null> {
  if (!invoice.paymentAttemptId) return null;
  const snapshot = await db()
    .collection("invoicePaymentAttempts")
    .doc(invoice.paymentAttemptId)
    .get();
  if (!snapshot.exists) return null;
  const attempt = snapshot.data() as StoredPaymentAttempt;
  return attempt.invoiceId === invoice.id ? attempt : null;
}

export async function getPublicInvoiceCheckout(
  token: string,
  recordView: boolean
): Promise<PublicInvoiceCheckout | null> {
  const invoice = await getInvoiceByPublicToken(token, recordView);
  if (!invoice) return null;

  const [profileSnapshot, userSnapshot, attempt] = await Promise.all([
    db().collection("invoiceProfiles").doc(invoice.profileId).get(),
    db().collection("users").doc(invoice.ownerUid).get(),
    loadAttempt(invoice),
  ]);
  const profile = profileSnapshot.data() as InvoiceProfile | undefined;
  const user = userSnapshot.data();

  let availabilityMessage: string | undefined;
  let rails: PublicPaymentRail[] = [];
  if (!isPayable(invoice)) {
    availabilityMessage =
      invoice.paymentStatus === "paid"
        ? "This invoice has been paid."
        : "This invoice is not currently accepting payment.";
  } else if (
    !profile ||
    profile.ownerUid !== invoice.ownerUid ||
    !settlementReady(profile.settlement)
  ) {
    availabilityMessage = "Online payment is temporarily unavailable.";
  } else if (!user?.bridgeCustomerId || user.kycStatus !== "approved") {
    availabilityMessage = "Online payment is temporarily unavailable.";
  } else {
    rails = paymentRailChoices(invoice, profile);
    if (rails.length === 0) {
      availabilityMessage = "No payment rail is available for this invoice currency.";
    }
  }

  return {
    invoice: publicInvoiceProjection(invoice),
    rails,
    checkoutAvailable: rails.length > 0,
    availabilityMessage,
    payment: publicPayment(attempt),
  };
}

function requestIp(request: Request): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return forwarded.split(",")[0]?.trim().slice(0, 128) || "unknown";
}

function destinationFor(profile: InvoiceProfile): BridgeTransferCreateInput["destination"] {
  const settlement = profile.settlement;
  if (settlement.destinationType === "bridge_wallet") {
    return {
      payment_rail: "bridge_wallet",
      currency: settlement.currency.toLowerCase(),
      bridge_wallet_id: settlement.bridgeWalletId!,
    };
  }
  return {
    payment_rail: settlement.paymentRail.toLowerCase(),
    currency: settlement.currency.toLowerCase(),
    to_address: settlement.address!,
  };
}

function developerFeePercent(profile: InvoiceProfile): string | undefined {
  const configured =
    profile.settlement.developerFeePercent ??
    process.env.INVOICE_DEVELOPER_FEE_PERCENT ??
    "0";
  try {
    const value = new Decimal(configured);
    if (!value.isFinite() || value.lt(0) || value.gt(10)) {
      throw new Error("Invoice developer fee must be between 0 and 10 percent");
    }
    return value.isZero() ? undefined : value.toString();
  } catch {
    throw new InvoicePaymentError("Invoice payment fee configuration is invalid", 409);
  }
}

export function buildInvoiceTransferRequest(
  invoice: Invoice,
  profile: InvoiceProfile,
  bridgeCustomerId: string,
  rail: PublicPaymentRail
): BridgeTransferCreateInput {
  const feePercent = developerFeePercent(profile);
  return {
    amount: exactInvoiceAmount(invoice),
    on_behalf_of: bridgeCustomerId,
    ...(feePercent ? { developer_fee_percent: feePercent } : {}),
    source: {
      payment_rail: rail.rail,
      currency: rail.currency,
    },
    destination: destinationFor(profile),
  };
}

async function prepareAttempt(
  token: string,
  sourceRail: string,
  request: Request
): Promise<StoredPaymentAttempt> {
  const invoice = await getInvoiceByPublicToken(token);
  if (!invoice) throw new InvoicePaymentError("Invoice not found", 404);

  const invoiceRef = db().collection("invoices").doc(invoice.id);
  const profileRef = db().collection("invoiceProfiles").doc(invoice.profileId);
  const userRef = db().collection("users").doc(invoice.ownerUid);
  const lockRef = db()
    .collection("invoicePaymentLocks")
    .doc(sha256(`${invoice.id}:${sourceRail}`));
  const bucketStart = Math.floor(Date.now() / CHECKOUT_WINDOW_MS) * CHECKOUT_WINDOW_MS;
  const ipHash = sha256(requestIp(request));
  const throttleRef = db()
    .collection("invoiceCheckoutThrottles")
    .doc(sha256(`${invoice.id}:${ipHash}:${bucketStart}`));

  return db().runTransaction(async (transaction) => {
    const [invoiceSnapshot, profileSnapshot, userSnapshot, lockSnapshot, throttleSnapshot] =
      await Promise.all([
        transaction.get(invoiceRef),
        transaction.get(profileRef),
        transaction.get(userRef),
        transaction.get(lockRef),
        transaction.get(throttleRef),
      ]);

    const current = invoiceSnapshot.data() as Invoice | undefined;
    const profile = profileSnapshot.data() as InvoiceProfile | undefined;
    const user = userSnapshot.data();
    if (!current || current.publicTokenHash !== sha256(token)) {
      throw new InvoicePaymentError("Invoice not found", 404);
    }
    if (!isPayable(current)) {
      throw new InvoicePaymentError(
        current.paymentStatus === "paid"
          ? "This invoice has already been paid"
          : "This invoice is not accepting payment",
        409
      );
    }
    if (
      !profile ||
      profile.ownerUid !== current.ownerUid ||
      !settlementReady(profile.settlement)
    ) {
      throw new InvoicePaymentError("Invoice settlement is not configured", 409);
    }
    if (!user?.bridgeCustomerId || user.kycStatus !== "approved") {
      throw new InvoicePaymentError("Invoice issuer is not ready to accept payment", 409);
    }

    const rail = paymentRailChoices(current, profile).find(
      (choice) => choice.rail === sourceRail
    );
    if (!rail) {
      throw new InvoicePaymentError("That payment rail is not accepted for this invoice", 400);
    }

    const count = Number(throttleSnapshot.data()?.count ?? 0);
    if (count >= CHECKOUT_LIMIT) {
      throw new InvoicePaymentError("Too many checkout attempts. Please try again later.", 429);
    }

    const lockedAttemptId = lockSnapshot.data()?.attemptId;
    let lockedAttempt: StoredPaymentAttempt | null = null;
    if (typeof lockedAttemptId === "string") {
      const attemptSnapshot = await transaction.get(
        db().collection("invoicePaymentAttempts").doc(lockedAttemptId)
      );
      if (attemptSnapshot.exists) {
        const candidate = attemptSnapshot.data() as StoredPaymentAttempt;
        if (
          candidate.invoiceId === current.id &&
          candidate.sourceRail === rail.rail &&
          ACTIVE_ATTEMPT_STATUSES.has(candidate.status)
        ) {
          lockedAttempt = candidate;
        }
      }
    }

    transaction.set(
      throttleRef,
      {
        invoiceId: current.id,
        ipHash,
        bucketStart: new Date(bucketStart).toISOString(),
        count: count + 1,
        updatedAt: now(),
      },
      { merge: true }
    );

    if (lockedAttempt) return lockedAttempt;

    const timestamp = now();
    const attemptRef = db().collection("invoicePaymentAttempts").doc();
    const providerRequest = buildInvoiceTransferRequest(
      current,
      profile,
      user.bridgeCustomerId,
      rail
    );
    const amount = providerRequest.amount;
    const attempt: StoredPaymentAttempt = {
      id: attemptRef.id,
      invoiceId: current.id,
      ownerUid: current.ownerUid,
      profileId: current.profileId,
      provider: "bridge",
      idempotencyKey: randomUUID(),
      sourceRail: rail.rail,
      sourceCurrency: rail.currency,
      destinationRail: providerRequest.destination.payment_rail,
      destinationCurrency: providerRequest.destination.currency,
      amount,
      status: "pending",
      providerState: "creating",
      providerRequest,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    transaction.create(attemptRef, attempt);
    transaction.set(lockRef, {
      invoiceId: current.id,
      sourceRail: rail.rail,
      attemptId: attempt.id,
      updatedAt: timestamp,
    });
    transaction.update(invoiceRef, {
      status: "payment_pending",
      paymentStatus: "pending",
      paymentAttemptId: attempt.id,
      updatedAt: timestamp,
    });
    return attempt;
  });
}

function transferStatus(state: string): {
  attempt: InvoicePaymentStatus;
  invoice: InvoiceStatus;
} {
  switch (state) {
    case "completed":
    case "payment_processed":
      return { attempt: "paid", invoice: "paid" };
    case "returned":
      return { attempt: "refunded", invoice: "refunded" };
    case "canceled":
    case "error":
      return { attempt: "failed", invoice: "payment_failed" };
    case "in_review":
    case "funds_received":
    case "payment_submitted":
      return { attempt: "processing", invoice: "payment_pending" };
    default:
      return { attempt: "pending", invoice: "payment_pending" };
  }
}

function transferMatchesAttempt(
  transfer: BridgeTransfer,
  attempt: StoredPaymentAttempt
): boolean {
  const request = attempt.providerRequest;
  try {
    return (
      transfer.id === attempt.providerPaymentId &&
      new Decimal(transfer.amount).eq(request.amount) &&
      (!transfer.on_behalf_of || transfer.on_behalf_of === request.on_behalf_of) &&
      transfer.source?.payment_rail === request.source.payment_rail &&
      transfer.source?.currency === request.source.currency &&
      transfer.destination?.payment_rail === request.destination.payment_rail &&
      transfer.destination?.currency === request.destination.currency
    );
  } catch {
    return false;
  }
}

function nextAttemptStatus(
  current: InvoicePaymentStatus,
  incoming: InvoicePaymentStatus
): InvoicePaymentStatus {
  if (current === "refunded" || incoming === "refunded") return "refunded";
  if (current === "paid" || incoming === "paid") return "paid";
  if (current === "failed") return "failed";
  return incoming;
}

function invoiceStatusForPayment(
  status: InvoicePaymentStatus,
  mapped: InvoiceStatus
): InvoiceStatus {
  if (status === "paid") return "paid";
  if (status === "refunded") return "refunded";
  if (status === "failed") return "payment_failed";
  return mapped;
}

async function persistTransfer(
  attemptId: string,
  transfer: BridgeTransfer
): Promise<StoredPaymentAttempt> {
  const attemptRef = db().collection("invoicePaymentAttempts").doc(attemptId);
  return db().runTransaction(async (transaction) => {
    const attemptSnapshot = await transaction.get(attemptRef);
    if (!attemptSnapshot.exists) {
      throw new InvoicePaymentError("Payment attempt not found", 404);
    }
    const attempt = attemptSnapshot.data() as StoredPaymentAttempt;
    const invoiceRef = db().collection("invoices").doc(attempt.invoiceId);
    const invoiceSnapshot = await transaction.get(invoiceRef);
    const invoice = invoiceSnapshot.data() as Invoice | undefined;
    if (!invoice) throw new InvoicePaymentError("Invoice not found", 404);

    const candidate = { ...attempt, providerPaymentId: transfer.id };
    if (!transferMatchesAttempt(transfer, candidate)) {
      throw new InvoicePaymentError("Bridge returned mismatched transfer details", 502);
    }

    const mapped = transferStatus(transfer.state);
    const status = nextAttemptStatus(attempt.status, mapped.attempt);
    const timestamp = now();
    const isStale = Boolean(
      attempt.providerUpdatedAt &&
        transfer.updated_at &&
        transfer.updated_at < attempt.providerUpdatedAt
    );
    const updates: Partial<StoredPaymentAttempt> = {
      providerPaymentId: transfer.id,
      depositInstructions: transfer.source_deposit_instructions,
      updatedAt: timestamp,
    };
    if (!isStale) {
      updates.status = status;
      updates.providerState = transfer.state;
      updates.providerUpdatedAt = transfer.updated_at;
      if (status === "paid") updates.completedAt = timestamp;
    }
    transaction.update(attemptRef, updates);

    if (!isStale && (invoice.paymentAttemptId === attempt.id || status === "paid")) {
      const invoiceUpdates: Record<string, unknown> = {
        status: invoiceStatusForPayment(status, mapped.invoice),
        paymentStatus: status,
        paymentAttemptId: attempt.id,
        bridgeTransferId: transfer.id,
        updatedAt: timestamp,
      };
      if (status === "paid") invoiceUpdates.paidAt = timestamp;
      if (invoice.paymentStatus === "paid" && status !== "paid") {
        delete invoiceUpdates.status;
        delete invoiceUpdates.paymentStatus;
      }
      transaction.update(invoiceRef, invoiceUpdates);
    }

    return { ...attempt, ...updates, status: updates.status ?? attempt.status };
  });
}

async function markCreateFailure(attempt: StoredPaymentAttempt): Promise<void> {
  const attemptRef = db().collection("invoicePaymentAttempts").doc(attempt.id);
  const invoiceRef = db().collection("invoices").doc(attempt.invoiceId);
  await db().runTransaction(async (transaction) => {
    const [attemptSnapshot, invoiceSnapshot] = await Promise.all([
      transaction.get(attemptRef),
      transaction.get(invoiceRef),
    ]);
    const currentAttempt = attemptSnapshot.data() as StoredPaymentAttempt | undefined;
    const invoice = invoiceSnapshot.data() as Invoice | undefined;
    if (!currentAttempt || currentAttempt.providerPaymentId) return;
    const timestamp = now();
    transaction.update(attemptRef, {
      status: "failed",
      providerState: "create_failed",
      updatedAt: timestamp,
      completedAt: timestamp,
    });
    if (invoice?.paymentAttemptId === attempt.id && invoice.paymentStatus !== "paid") {
      transaction.update(invoiceRef, {
        status: "payment_failed",
        paymentStatus: "failed",
        updatedAt: timestamp,
      });
    }
  });
}

export async function checkoutInvoice(
  token: string,
  sourceRailInput: string,
  request: Request
): Promise<PublicPaymentState> {
  const sourceRail = sourceRailInput.trim().toLowerCase();
  const attempt = await prepareAttempt(token, sourceRail, request);
  if (attempt.providerPaymentId) return publicPayment(attempt)!;

  let transfer: BridgeTransfer;
  try {
    transfer = await createTransfer(attempt.providerRequest, {
      idempotencyKey: attempt.idempotencyKey,
    });
  } catch (error) {
    const definitive =
      error instanceof BridgeError &&
      error.status >= 400 &&
      error.status < 500 &&
      ![408, 409, 425, 429].includes(error.status);
    if (definitive) await markCreateFailure(attempt);
    throw new InvoicePaymentError(
      definitive
        ? "Bridge could not create payment instructions for this rail."
        : "Payment instructions are still being created. Please retry shortly.",
      502
    );
  }

  const updated = await persistTransfer(attempt.id, transfer);
  return publicPayment(updated)!;
}

export async function refreshInvoicePayment(token: string): Promise<PublicPaymentState | null> {
  const invoice = await getInvoiceByPublicToken(token);
  if (!invoice) throw new InvoicePaymentError("Invoice not found", 404);
  const attempt = await loadAttempt(invoice);
  if (!attempt) return null;
  if (!attempt.providerPaymentId || ["paid", "failed", "refunded"].includes(attempt.status)) {
    return publicPayment(attempt);
  }
  const transfer = await getTransfer(attempt.providerPaymentId);
  return publicPayment(await persistTransfer(attempt.id, transfer));
}

export async function processBridgeWebhookEvent(
  event: BridgeWebhookEvent
): Promise<{ duplicate: boolean; matched: boolean }> {
  const transfer = event.event_object as unknown as BridgeTransfer;
  const transferId = typeof transfer?.id === "string" ? transfer.id : "";
  if (!event.event_id || !transferId) {
    throw new InvoicePaymentError("Invalid webhook event", 400);
  }

  const matches = await db()
    .collection("invoicePaymentAttempts")
    .where("providerPaymentId", "==", transferId)
    .limit(1)
    .get();
  const matchedDocument = matches.docs[0];
  const eventRef = db().collection("bridgeWebhookEvents").doc(sha256(event.event_id));

  return db().runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) {
      return {
        duplicate: true,
        matched: Boolean(eventSnapshot.data()?.matched),
      };
    }

    let attempt: StoredPaymentAttempt | undefined;
    let invoice: Invoice | undefined;
    let attemptRef: DocumentReference | undefined;
    let invoiceRef: DocumentReference | undefined;
    if (matchedDocument) {
      attemptRef = matchedDocument.ref;
      const attemptSnapshot = await transaction.get(attemptRef);
      attempt = attemptSnapshot.data() as StoredPaymentAttempt | undefined;
      if (attempt) {
        invoiceRef = db().collection("invoices").doc(attempt.invoiceId);
        const invoiceSnapshot = await transaction.get(invoiceRef);
        invoice = invoiceSnapshot.data() as Invoice | undefined;
      }
    }

    const matched = Boolean(
      attempt &&
        invoice &&
        attempt.providerPaymentId === transferId &&
        transferMatchesAttempt(transfer, attempt)
    );
    const timestamp = now();
    transaction.create(eventRef, {
      eventId: event.event_id,
      eventType: event.event_type,
      eventCategory: event.event_category ?? null,
      eventCreatedAt: event.event_created_at ?? null,
      objectId: transferId,
      matched,
      receivedAt: timestamp,
    });

    if (matched && attempt && invoice && attemptRef && invoiceRef) {
      const mapped = transferStatus(transfer.state);
      const status = nextAttemptStatus(attempt.status, mapped.attempt);
      const isStale = Boolean(
        attempt.providerUpdatedAt &&
          transfer.updated_at &&
          transfer.updated_at < attempt.providerUpdatedAt
      );
      if (!isStale) {
        const attemptUpdates: Record<string, unknown> = {
          status,
          providerState: transfer.state,
          providerUpdatedAt: transfer.updated_at,
          depositInstructions: transfer.source_deposit_instructions ?? null,
          updatedAt: timestamp,
        };
        if (status === "paid") attemptUpdates.completedAt = timestamp;
        transaction.update(attemptRef, attemptUpdates);

        if (invoice.paymentAttemptId === attempt.id || status === "paid") {
          const invoiceUpdates: Record<string, unknown> = {
            status: invoiceStatusForPayment(status, mapped.invoice),
            paymentStatus: status,
            paymentAttemptId: attempt.id,
            bridgeTransferId: transfer.id,
            updatedAt: timestamp,
          };
          if (status === "paid") invoiceUpdates.paidAt = timestamp;
          if (invoice.paymentStatus === "paid" && status !== "paid") {
            delete invoiceUpdates.status;
            delete invoiceUpdates.paymentStatus;
          }
          transaction.update(invoiceRef, invoiceUpdates);
        }
      }
    }

    return { duplicate: false, matched };
  });
}
