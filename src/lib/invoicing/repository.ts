import { createHash, randomBytes, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { addDays } from "date-fns";
import Decimal from "decimal.js";
import { getAdminDb } from "@/lib/firebase/admin";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { calculateInvoiceTotals } from "@/lib/invoicing/money";
import type {
  Invoice,
  InvoiceClient,
  InvoiceProfile,
  InvoiceSettlementSettings,
  PublicInvoice,
  RecurringInvoice,
} from "@/types/invoicing";
import type { UserDoc } from "@/lib/users";
import type {
  InvoiceClientInput,
  InvoiceInput,
  InvoiceProfileInput,
  RecurringInvoiceInput,
} from "@/lib/invoicing/schemas";

const db = () => getAdminDb();
const now = () => new Date().toISOString();

function assertOwner<T extends { ownerUid: string }>(
  value: T | undefined,
  ownerUid: string,
  label: string
): T {
  if (!value || value.ownerUid !== ownerUid) throw new Error(`${label} not found`);
  return value;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(5, "0")}`;
}

export function publicInvoiceProjection(invoice: Invoice): PublicInvoice {
  return {
    formattedNumber: invoice.formattedNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    currency: invoice.currency,
    lineItems: invoice.lineItems,
    totals: invoice.totals,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    templateId: invoice.templateId,
    sender: invoice.senderSnapshot,
    client: invoice.clientSnapshot,
  };
}

export async function listInvoiceProfiles(ownerUid: string): Promise<InvoiceProfile[]> {
  const snapshot = await db()
    .collection("invoiceProfiles")
    .where("ownerUid", "==", ownerUid)
    .orderBy("createdAt", "asc")
    .get();
  return snapshot.docs.map((document) => document.data() as InvoiceProfile);
}

export async function getInvoiceProfile(
  ownerUid: string,
  profileId: string
): Promise<InvoiceProfile> {
  const snapshot = await db().collection("invoiceProfiles").doc(profileId).get();
  return assertOwner(snapshot.data() as InvoiceProfile | undefined, ownerUid, "Invoice profile");
}

export async function ensureDefaultInvoiceProfile(user: UserDoc): Promise<InvoiceProfile> {
  const profiles = await listInvoiceProfiles(user.uid);
  if (profiles.length > 0) return profiles.find((profile) => profile.isDefault) ?? profiles[0];

  const timestamp = now();
  const ref = db().collection("invoiceProfiles").doc();
  const profile: InvoiceProfile = {
    id: ref.id,
    ownerUid: user.uid,
    name: "Default",
    company: user.name || user.email.split("@")[0] || "My business",
    displayName: user.name || user.email.split("@")[0] || "My business",
    email: user.email,
    address: {
      street: "",
      city: "",
      postalCode: "",
      country: "United States",
    },
    isDefault: true,
    settings: {
      prefix: "INV",
      nextNumber: 1,
      taxRate: "0",
      currency: "USD",
      paymentTerms: "Due on receipt",
      dueDateDuration: 7,
      autoIncrementNumber: true,
      timezone: "UTC",
      templateId: "modern-blue",
    },
    settlement: {
      enabled: false,
      destinationType: "address",
      paymentRail: "ethereum",
      currency: "usdc",
      developerFeePercent: process.env.INVOICE_DEVELOPER_FEE_PERCENT || "0",
      acceptedFiatRails: ["ach_push", "wire", "sepa", "faster_payments"],
      acceptedCryptoRails: ["ethereum", "base", "polygon", "solana", "tron"],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await ref.set(profile);
  return profile;
}

export async function createInvoiceProfile(
  ownerUid: string,
  input: InvoiceProfileInput
): Promise<InvoiceProfile> {
  const timestamp = now();
  const ref = db().collection("invoiceProfiles").doc();
  const profile: InvoiceProfile = {
    id: ref.id,
    ownerUid,
    ...input,
    logoUrl: input.logoUrl || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const batch = db().batch();
  if (profile.isDefault) {
    const current = await db()
      .collection("invoiceProfiles")
      .where("ownerUid", "==", ownerUid)
      .where("isDefault", "==", true)
      .get();
    current.docs.forEach((document) => batch.update(document.ref, { isDefault: false }));
  }
  batch.set(ref, profile);
  await batch.commit();
  return profile;
}

export async function updateInvoiceProfile(
  ownerUid: string,
  profileId: string,
  input: InvoiceProfileInput
): Promise<InvoiceProfile> {
  await getInvoiceProfile(ownerUid, profileId);
  const ref = db().collection("invoiceProfiles").doc(profileId);
  const sequenceRef = db().collection("invoiceSequences").doc(`${ownerUid}_${profileId}`);
  const currentDefaults = input.isDefault
    ? await db()
      .collection("invoiceProfiles")
      .where("ownerUid", "==", ownerUid)
      .where("isDefault", "==", true)
      .get()
    : null;
  const timestamp = now();
  await db().runTransaction(async (transaction) => {
    const sequence = await transaction.get(sequenceRef);
    const allocatedNext = sequence.data()?.nextNumber as number | undefined;
    if (allocatedNext && input.settings.nextNumber < allocatedNext) {
      throw new Error(
        `Next invoice number cannot be lower than ${allocatedNext}`
      );
    }
    currentDefaults?.docs
      .filter((document) => document.id !== profileId)
      .forEach((document) => transaction.update(document.ref, { isDefault: false }));
    transaction.update(ref, {
      ...input,
      logoUrl: input.logoUrl || null,
      updatedAt: timestamp,
    });
    transaction.set(
      sequenceRef,
      {
        ownerUid,
        profileId,
        nextNumber: input.settings.nextNumber,
        updatedAt: timestamp,
      },
      { merge: true }
    );
  });
  return getInvoiceProfile(ownerUid, profileId);
}

export async function listInvoiceClients(
  ownerUid: string,
  profileId?: string
): Promise<InvoiceClient[]> {
  let query = db().collection("invoiceClients").where("ownerUid", "==", ownerUid);
  if (profileId) query = query.where("profileId", "==", profileId);
  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map((document) => document.data() as InvoiceClient);
}

export async function getInvoiceClient(
  ownerUid: string,
  clientId: string
): Promise<InvoiceClient> {
  const snapshot = await db().collection("invoiceClients").doc(clientId).get();
  return assertOwner(snapshot.data() as InvoiceClient | undefined, ownerUid, "Client");
}

export async function createInvoiceClient(
  ownerUid: string,
  input: InvoiceClientInput
): Promise<InvoiceClient> {
  await getInvoiceProfile(ownerUid, input.profileId);
  const timestamp = now();
  const ref = db().collection("invoiceClients").doc();
  const client: InvoiceClient = {
    id: ref.id,
    ownerUid,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await ref.set(client);
  return client;
}

export async function updateInvoiceClient(
  ownerUid: string,
  clientId: string,
  input: InvoiceClientInput
): Promise<InvoiceClient> {
  const existing = await getInvoiceClient(ownerUid, clientId);
  if (existing.profileId !== input.profileId) {
    throw new Error("A client cannot be moved to another invoice profile");
  }
  await db().collection("invoiceClients").doc(clientId).update({ ...input, updatedAt: now() });
  return getInvoiceClient(ownerUid, clientId);
}

export async function deleteInvoiceClient(ownerUid: string, clientId: string): Promise<void> {
  await getInvoiceClient(ownerUid, clientId);
  const used = await db()
    .collection("invoices")
    .where("ownerUid", "==", ownerUid)
    .where("clientId", "==", clientId)
    .limit(1)
    .get();
  if (!used.empty) throw new Error("This client has invoices and cannot be deleted");
  await db().collection("invoiceClients").doc(clientId).delete();
}

export async function listInvoices(
  ownerUid: string,
  profileId?: string
): Promise<Invoice[]> {
  let query = db().collection("invoices").where("ownerUid", "==", ownerUid);
  if (profileId) query = query.where("profileId", "==", profileId);
  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map((document) => document.data() as Invoice);
}

export async function getInvoice(ownerUid: string, invoiceId: string): Promise<Invoice> {
  const snapshot = await db().collection("invoices").doc(invoiceId).get();
  return assertOwner(snapshot.data() as Invoice | undefined, ownerUid, "Invoice");
}

export async function createInvoice(
  ownerUid: string,
  input: InvoiceInput,
  recurringInvoiceId?: string
): Promise<Invoice> {
  const [profile, client] = await Promise.all([
    getInvoiceProfile(ownerUid, input.profileId),
    getInvoiceClient(ownerUid, input.clientId),
  ]);
  if (client.profileId !== profile.id) throw new Error("Client does not belong to this profile");

  const computed = calculateInvoiceTotals(
    input.lineItems.map((item) => ({ ...item, id: item.id || randomUUID() })),
    input.currency,
    input.taxRate,
    input.discountType,
    input.discountValue
  );
  const timestamp = now();
  const invoiceRef = db().collection("invoices").doc();
  const sequenceRef = db().collection("invoiceSequences").doc(`${ownerUid}_${profile.id}`);

  return db().runTransaction(async (transaction) => {
    const sequenceSnapshot = await transaction.get(sequenceRef);
    const nextNumber =
      (sequenceSnapshot.data()?.nextNumber as number | undefined) ??
      profile.settings.nextNumber ??
      1;

    const invoice: Invoice = {
      id: invoiceRef.id,
      ownerUid,
      profileId: profile.id,
      clientId: client.id,
      invoiceNumber: nextNumber,
      formattedNumber:
        input.formattedNumber || formatInvoiceNumber(profile.settings.prefix, nextNumber),
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: "draft",
      paymentStatus: "unpaid",
      currency: input.currency,
      lineItems: computed.lineItems,
      totals: computed.totals,
      notes: input.notes,
      paymentTerms: input.paymentTerms,
      templateId: input.templateId,
      senderSnapshot: {
        profileId: profile.id,
        displayName: profile.displayName,
        company: profile.company,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        logoUrl: profile.logoUrl,
      },
      clientSnapshot: {
        clientId: client.id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
      viewCount: 0,
      sentCount: 0,
      recurringInvoiceId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    transaction.set(invoiceRef, invoice);
    transaction.set(
      sequenceRef,
      {
        ownerUid,
        profileId: profile.id,
        nextNumber: nextNumber + 1,
        updatedAt: timestamp,
      },
      { merge: true }
    );
    transaction.update(db().collection("invoiceProfiles").doc(profile.id), {
      "settings.nextNumber": nextNumber + 1,
      updatedAt: timestamp,
    });
    return invoice;
  });
}

export async function updateInvoice(
  ownerUid: string,
  invoiceId: string,
  input: InvoiceInput
): Promise<Invoice> {
  const invoice = await getInvoice(ownerUid, invoiceId);
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be edited");
  if (invoice.profileId !== input.profileId) throw new Error("Invoice profile cannot be changed");

  const [profile, client] = await Promise.all([
    getInvoiceProfile(ownerUid, input.profileId),
    getInvoiceClient(ownerUid, input.clientId),
  ]);
  if (client.profileId !== profile.id) throw new Error("Client does not belong to this profile");

  const computed = calculateInvoiceTotals(
    input.lineItems.map((item) => ({ ...item, id: item.id || randomUUID() })),
    input.currency,
    input.taxRate,
    input.discountType,
    input.discountValue
  );
  await db()
    .collection("invoices")
    .doc(invoiceId)
    .update({
      clientId: client.id,
      formattedNumber: input.formattedNumber || invoice.formattedNumber,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      lineItems: computed.lineItems,
      totals: computed.totals,
      notes: input.notes,
      paymentTerms: input.paymentTerms,
      templateId: input.templateId,
      senderSnapshot: {
        profileId: profile.id,
        displayName: profile.displayName,
        company: profile.company,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        logoUrl: profile.logoUrl,
      },
      clientSnapshot: {
        clientId: client.id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
      updatedAt: now(),
    });
  return getInvoice(ownerUid, invoiceId);
}

export function settlementReady(settlement: InvoiceSettlementSettings): boolean {
  if (!settlement.enabled || !settlement.paymentRail || !settlement.currency) return false;
  if (settlement.destinationType === "bridge_wallet") return Boolean(settlement.bridgeWalletId);
  return Boolean(settlement.address);
}

export async function publishInvoice(
  user: UserDoc,
  invoiceId: string
): Promise<{ invoice: Invoice; token: string }> {
  const invoice = await getInvoice(user.uid, invoiceId);
  if (!["draft", "sent"].includes(invoice.status)) {
    throw new Error("This invoice cannot be published");
  }
  const profile = await getInvoiceProfile(user.uid, invoice.profileId);
  if (profile.settlement.enabled) {
    if (!user.bridgeCustomerId || user.kycStatus !== "approved") {
      throw new Error(
        "Complete Bridge identity verification before publishing payment-enabled invoices"
      );
    }
    if (!settlementReady(profile.settlement)) {
      throw new Error("Configure a valid invoice settlement destination before publishing");
    }
  }

  if (invoice.publicTokenEncrypted) {
    return { invoice, token: decryptSecret(invoice.publicTokenEncrypted) };
  }

  const token = randomBytes(32).toString("base64url");
  const timestamp = now();
  await db().collection("invoices").doc(invoiceId).update({
    publicTokenHash: hashToken(token),
    publicTokenEncrypted: encryptSecret(token),
    publicTokenHint: token.slice(-6),
    status: "sent",
    publishedAt: timestamp,
    updatedAt: timestamp,
  });
  return { invoice: await getInvoice(user.uid, invoiceId), token };
}

export async function getInvoiceByPublicToken(
  token: string,
  recordView = false
): Promise<Invoice | null> {
  if (token.length < 32 || token.length > 128) return null;
  const snapshot = await db()
    .collection("invoices")
    .where("publicTokenHash", "==", hashToken(token))
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const invoice = snapshot.docs[0].data() as Invoice;
  if (invoice.status === "void") return null;

  if (recordView) {
    const timestamp = now();
    await snapshot.docs[0].ref.update({
      firstViewedAt: invoice.firstViewedAt || timestamp,
      lastViewedAt: timestamp,
      viewCount: FieldValue.increment(1),
      status: invoice.status === "sent" ? "viewed" : invoice.status,
      updatedAt: timestamp,
    });
    return {
      ...invoice,
      firstViewedAt: invoice.firstViewedAt || timestamp,
      lastViewedAt: timestamp,
      viewCount: invoice.viewCount + 1,
      status: invoice.status === "sent" ? "viewed" : invoice.status,
    };
  }
  return invoice;
}

export async function deleteInvoice(ownerUid: string, invoiceId: string): Promise<void> {
  const invoice = await getInvoice(ownerUid, invoiceId);
  if (invoice.status !== "draft" && invoice.status !== "void") {
    throw new Error("Only draft or void invoices can be deleted");
  }
  await db().collection("invoices").doc(invoiceId).delete();
}

export async function duplicateInvoice(ownerUid: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoice(ownerUid, invoiceId);
  const issueDate = new Date();
  const originalDuration = Math.max(
    0,
    Math.round(
      (new Date(`${invoice.dueDate}T12:00:00Z`).getTime() -
        new Date(`${invoice.issueDate}T12:00:00Z`).getTime()) /
        86_400_000
    )
  );
  return createInvoice(ownerUid, {
    profileId: invoice.profileId,
    clientId: invoice.clientId,
    issueDate: issueDate.toISOString().slice(0, 10),
    dueDate: addDays(issueDate, originalDuration).toISOString().slice(0, 10),
    currency: invoice.currency,
    lineItems: invoice.lineItems.map(({ description, quantity, rate }) => ({
      description,
      quantity,
      rate,
    })),
    taxRate: invoice.totals.taxRate,
    discountType: invoice.totals.discountType,
    discountValue: invoice.totals.discountValue,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    templateId: invoice.templateId,
  });
}

export async function voidInvoice(ownerUid: string, invoiceId: string): Promise<Invoice> {
  const invoice = await getInvoice(ownerUid, invoiceId);
  if (invoice.paymentStatus === "paid") throw new Error("A paid invoice cannot be voided");
  await db().collection("invoices").doc(invoiceId).update({
    status: "void",
    publicTokenHash: FieldValue.delete(),
    publicTokenEncrypted: FieldValue.delete(),
    updatedAt: now(),
  });
  return getInvoice(ownerUid, invoiceId);
}

export async function invoiceStats(ownerUid: string): Promise<{
  total: number;
  draft: number;
  outstanding: number;
  overdue: number;
  paid: number;
  paidRevenue: Record<string, string>;
  outstandingRevenue: Record<string, string>;
}> {
  const invoices = await listInvoices(ownerUid);
  const result = {
    total: invoices.length,
    draft: 0,
    outstanding: 0,
    overdue: 0,
    paid: 0,
    paidRevenue: {} as Record<string, string>,
    outstandingRevenue: {} as Record<string, string>,
  };
  const addRevenue = (
    bucket: Record<string, string>,
    currency: string,
    value: string
  ) => {
    bucket[currency] = new Decimal(bucket[currency] || 0).plus(value).toString();
  };
  for (const invoice of invoices) {
    if (invoice.status === "draft") result.draft += 1;
    else if (invoice.status === "paid") {
      result.paid += 1;
      addRevenue(result.paidRevenue, invoice.currency, invoice.totals.total);
    } else if (!["void", "refunded"].includes(invoice.status)) {
      result.outstanding += 1;
      if (invoice.dueDate < new Date().toISOString().slice(0, 10)) result.overdue += 1;
      addRevenue(
        result.outstandingRevenue,
        invoice.currency,
        invoice.totals.total
      );
    }
  }
  return result;
}

export async function createRecurringInvoice(
  ownerUid: string,
  input: RecurringInvoiceInput,
  nextGenerationDate: string
): Promise<RecurringInvoice> {
  await Promise.all([
    getInvoiceProfile(ownerUid, input.profileId),
    getInvoiceClient(ownerUid, input.clientId),
  ]);
  const timestamp = now();
  const ref = db().collection("recurringInvoices").doc();
  const recurring: RecurringInvoice = {
    id: ref.id,
    ownerUid,
    ...input,
    lineItems: input.lineItems.map((item) => ({ ...item, id: item.id || randomUUID() })),
    nextGenerationDate,
    active: true,
    generatedInvoiceIds: [],
    totalGenerated: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await ref.set(recurring);
  return recurring;
}

export async function listRecurringInvoices(ownerUid: string): Promise<RecurringInvoice[]> {
  const snapshot = await db()
    .collection("recurringInvoices")
    .where("ownerUid", "==", ownerUid)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((document) => document.data() as RecurringInvoice);
}

export function defaultDueDate(days: number): string {
  return addDays(new Date(), days).toISOString().slice(0, 10);
}
