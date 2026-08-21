import { createHash, randomUUID } from "crypto";
import { addDays } from "date-fns";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getUserDoc } from "@/lib/users";
import { calculateInvoiceTotals } from "@/lib/invoicing/money";
import {
  invoiceDeliveryKey,
  markInvoiceSent,
  sendInvoiceEmail,
} from "@/lib/invoicing/delivery";
import { renderInvoicePdf } from "@/lib/invoicing/pdf";
import { toRenderableInvoice } from "@/lib/invoicing/renderable";
import {
  applyRecurringPlaceholders,
  nextRecurringDate,
} from "@/lib/invoicing/recurrence";
import {
  createRecurringInvoice,
  getInvoiceClient,
  getInvoiceProfile,
  listRecurringInvoices,
  publishInvoice,
} from "@/lib/invoicing/repository";
import type { RecurringInvoiceInput } from "@/lib/invoicing/schemas";
import type {
  Invoice,
  InvoiceClient,
  InvoiceProfile,
  RecurringFrequency,
  RecurringInvoice,
} from "@/types/invoicing";

const LEASE_DURATION_MS = 5 * 60 * 1000;
const INDEFINITE_PAUSE_DATE = "9999-12-31";

interface StoredRecurringInvoice extends RecurringInvoice {
  leaseToken?: string;
}

export interface RecurringInvoiceDetails {
  recurringInvoice: RecurringInvoice;
  generatedInvoices: Invoice[];
}

export interface SchedulerResult {
  scanned: number;
  generated: number;
  deliveriesRetried: number;
  skipped: number;
  failed: number;
  errors: Array<{ recurringInvoiceId: string; error: string }>;
}

const db = () => getAdminDb();
const now = () => new Date().toISOString();

function dateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addCalendarDays(value: string, days: number): string {
  return dateKey(addDays(dateFromKey(value), days));
}

function advanceDate(value: string, frequency: RecurringFrequency): string {
  return dateKey(nextRecurringDate(dateFromKey(value), frequency));
}

export function localDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function firstOccurrenceOnOrAfter(
  startDate: string,
  frequency: RecurringFrequency,
  minimumDate: string
): string {
  let candidate = startDate;
  while (candidate < minimumDate) candidate = advanceDate(candidate, frequency);
  return candidate;
}

function assertDateRange(startDate: string, endDate?: string) {
  if (endDate && endDate < startDate) {
    throw new Error("End date cannot be before start date");
  }
}

function withoutLeaseToken(value: StoredRecurringInvoice): RecurringInvoice {
  const recurring = { ...value };
  delete recurring.leaseToken;
  return recurring;
}

async function validateRelationships(
  ownerUid: string,
  input: RecurringInvoiceInput
): Promise<{ profile: InvoiceProfile; client: InvoiceClient }> {
  const [profile, client] = await Promise.all([
    getInvoiceProfile(ownerUid, input.profileId),
    getInvoiceClient(ownerUid, input.clientId),
  ]);
  if (client.profileId !== profile.id) {
    throw new Error("Client does not belong to this invoice profile");
  }
  return { profile, client };
}

export async function createRecurringSchedule(
  ownerUid: string,
  input: RecurringInvoiceInput
): Promise<RecurringInvoice> {
  assertDateRange(input.startDate, input.endDate);
  const { profile } = await validateRelationships(ownerUid, input);
  const today = localDateInTimezone(new Date(), profile.settings.timezone);
  const nextGenerationDate = firstOccurrenceOnOrAfter(
    input.startDate,
    input.frequency,
    today
  );
  if (input.endDate && nextGenerationDate > input.endDate) {
    throw new Error("End date must include at least one invoice occurrence");
  }
  return createRecurringInvoice(ownerUid, input, nextGenerationDate);
}

export async function listRecurringSchedules(ownerUid: string): Promise<RecurringInvoice[]> {
  const schedules = await listRecurringInvoices(ownerUid);
  return schedules.map((schedule) =>
    withoutLeaseToken(schedule as StoredRecurringInvoice)
  );
}

export async function getRecurringSchedule(
  ownerUid: string,
  recurringInvoiceId: string
): Promise<RecurringInvoice> {
  const snapshot = await db()
    .collection("recurringInvoices")
    .doc(recurringInvoiceId)
    .get();
  const recurring = snapshot.data() as StoredRecurringInvoice | undefined;
  if (!recurring || recurring.ownerUid !== ownerUid) {
    throw new Error("Recurring invoice not found");
  }
  return withoutLeaseToken(recurring);
}

export async function getRecurringScheduleDetails(
  ownerUid: string,
  recurringInvoiceId: string
): Promise<RecurringInvoiceDetails> {
  const recurringInvoice = await getRecurringSchedule(ownerUid, recurringInvoiceId);
  const history = await db()
    .collection("invoices")
    .where("ownerUid", "==", ownerUid)
    .where("recurringInvoiceId", "==", recurringInvoiceId)
    .orderBy("createdAt", "desc")
    .get();
  return {
    recurringInvoice,
    generatedInvoices: history.docs.map((document) => document.data() as Invoice),
  };
}

export async function updateRecurringSchedule(
  ownerUid: string,
  recurringInvoiceId: string,
  input: RecurringInvoiceInput
): Promise<RecurringInvoice> {
  assertDateRange(input.startDate, input.endDate);
  const [existing, { profile }] = await Promise.all([
    getRecurringSchedule(ownerUid, recurringInvoiceId),
    validateRelationships(ownerUid, input),
  ]);
  const scheduleChanged =
    existing.startDate !== input.startDate || existing.frequency !== input.frequency;
  let nextGenerationDate = existing.nextGenerationDate;
  if (scheduleChanged) {
    const today = localDateInTimezone(new Date(), profile.settings.timezone);
    nextGenerationDate = firstOccurrenceOnOrAfter(
      input.startDate,
      input.frequency,
      today
    );
  }
  if (input.endDate && nextGenerationDate > input.endDate) {
    throw new Error("End date must include the next invoice occurrence");
  }

  const ref = db().collection("recurringInvoices").doc(recurringInvoiceId);
  await ref.update({
    ...input,
    endDate: input.endDate ?? FieldValue.delete(),
    lineItems: input.lineItems.map((item) => ({
      ...item,
      id: item.id || randomUUID(),
    })),
    nextGenerationDate,
    updatedAt: now(),
  });
  return getRecurringSchedule(ownerUid, recurringInvoiceId);
}

export async function pauseRecurringSchedule(
  ownerUid: string,
  recurringInvoiceId: string,
  pausedUntil?: string
): Promise<RecurringInvoice> {
  const recurring = await getRecurringSchedule(ownerUid, recurringInvoiceId);
  if (!recurring.active) throw new Error("Stopped recurring invoices cannot be paused");
  const profile = await getInvoiceProfile(ownerUid, recurring.profileId);
  const effectiveDate = pausedUntil || INDEFINITE_PAUSE_DATE;
  const today = localDateInTimezone(new Date(), profile.settings.timezone);
  if (effectiveDate < today) {
    throw new Error("Pause date cannot be in the past");
  }
  await db().collection("recurringInvoices").doc(recurringInvoiceId).update({
    pausedUntil: effectiveDate,
    leaseUntil: FieldValue.delete(),
    leaseToken: FieldValue.delete(),
    updatedAt: now(),
  });
  return getRecurringSchedule(ownerUid, recurringInvoiceId);
}

export async function resumeRecurringSchedule(
  ownerUid: string,
  recurringInvoiceId: string
): Promise<RecurringInvoice> {
  const recurring = await getRecurringSchedule(ownerUid, recurringInvoiceId);
  if (!recurring.active) throw new Error("Stopped recurring invoices cannot be resumed");
  const profile = await getInvoiceProfile(ownerUid, recurring.profileId);
  const today = localDateInTimezone(new Date(), profile.settings.timezone);
  const nextGenerationDate =
    recurring.nextGenerationDate < today ? today : recurring.nextGenerationDate;
  if (recurring.endDate && nextGenerationDate > recurring.endDate) {
    throw new Error("This recurring invoice has passed its end date");
  }
  await db().collection("recurringInvoices").doc(recurringInvoiceId).update({
    pausedUntil: FieldValue.delete(),
    nextGenerationDate,
    updatedAt: now(),
  });
  return getRecurringSchedule(ownerUid, recurringInvoiceId);
}

export async function stopRecurringSchedule(
  ownerUid: string,
  recurringInvoiceId: string
): Promise<RecurringInvoice> {
  await getRecurringSchedule(ownerUid, recurringInvoiceId);
  await db().collection("recurringInvoices").doc(recurringInvoiceId).update({
    active: false,
    pausedUntil: FieldValue.delete(),
    leaseUntil: FieldValue.delete(),
    leaseToken: FieldValue.delete(),
    updatedAt: now(),
  });
  return getRecurringSchedule(ownerUid, recurringInvoiceId);
}

async function claimRecurringSchedule(
  recurringInvoiceId: string,
  ownerUid?: string
): Promise<{ recurring: RecurringInvoice; leaseToken: string } | null> {
  const ref = db().collection("recurringInvoices").doc(recurringInvoiceId);
  const leaseToken = randomUUID();
  const timestamp = new Date();
  return db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const recurring = snapshot.data() as StoredRecurringInvoice | undefined;
    if (!recurring || (ownerUid && recurring.ownerUid !== ownerUid)) {
      throw new Error("Recurring invoice not found");
    }
    if (!recurring.active) throw new Error("Recurring invoice has been stopped");
    if (
      recurring.leaseUntil &&
      recurring.leaseUntil > timestamp.toISOString()
    ) {
      return null;
    }
    transaction.update(ref, {
      leaseToken,
      leaseUntil: new Date(timestamp.getTime() + LEASE_DURATION_MS).toISOString(),
      updatedAt: timestamp.toISOString(),
    });
    return { recurring: withoutLeaseToken(recurring), leaseToken };
  });
}

async function releaseLease(recurringInvoiceId: string, leaseToken: string): Promise<void> {
  const ref = db().collection("recurringInvoices").doc(recurringInvoiceId);
  await db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.data()?.leaseToken === leaseToken) {
      transaction.update(ref, {
        leaseToken: FieldValue.delete(),
        leaseUntil: FieldValue.delete(),
        updatedAt: now(),
      });
    }
  });
}

async function expireClaimedSchedule(
  recurringInvoiceId: string,
  leaseToken: string
): Promise<void> {
  const ref = db().collection("recurringInvoices").doc(recurringInvoiceId);
  await db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.data()?.leaseToken === leaseToken) {
      transaction.update(ref, {
        active: false,
        leaseToken: FieldValue.delete(),
        leaseUntil: FieldValue.delete(),
        updatedAt: now(),
      });
    }
  });
}

function occurrenceId(recurringInvoiceId: string, occurrenceDate: string): string {
  return createHash("sha256")
    .update(`${recurringInvoiceId}:${occurrenceDate}`)
    .digest("hex");
}

function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(5, "0")}`;
}

async function generateClaimedOccurrence(
  recurringInvoiceId: string,
  occurrenceDate: string,
  leaseToken: string,
  advanceSchedule: boolean
): Promise<Invoice> {
  const recurringRef = db().collection("recurringInvoices").doc(recurringInvoiceId);
  const initialSnapshot = await recurringRef.get();
  const initial = initialSnapshot.data() as StoredRecurringInvoice | undefined;
  if (!initial) throw new Error("Recurring invoice not found");

  const [profile, client] = await Promise.all([
    getInvoiceProfile(initial.ownerUid, initial.profileId),
    getInvoiceClient(initial.ownerUid, initial.clientId),
  ]);
  if (client.profileId !== profile.id) {
    throw new Error("Client does not belong to this invoice profile");
  }

  const id = occurrenceId(recurringInvoiceId, occurrenceDate);
  const invoiceRef = db().collection("invoices").doc(id);
  const occurrenceRef = db().collection("recurringInvoiceOccurrences").doc(id);
  const sequenceRef = db()
    .collection("invoiceSequences")
    .doc(`${initial.ownerUid}_${profile.id}`);
  const profileRef = db().collection("invoiceProfiles").doc(profile.id);
  const computed = calculateInvoiceTotals(
    initial.lineItems.map((item) => ({
      ...item,
      description: applyRecurringPlaceholders(
        item.description,
        dateFromKey(occurrenceDate),
        initial.frequency
      ),
    })),
    initial.currency,
    initial.taxRate,
    initial.discountType,
    initial.discountValue
  );

  return db().runTransaction(async (transaction) => {
    const [
      recurringSnapshot,
      sequenceSnapshot,
      invoiceSnapshot,
      occurrenceSnapshot,
    ] = await Promise.all([
      transaction.get(recurringRef),
      transaction.get(sequenceRef),
      transaction.get(invoiceRef),
      transaction.get(occurrenceRef),
    ]);
    const recurring = recurringSnapshot.data() as StoredRecurringInvoice | undefined;
    if (!recurring || recurring.leaseToken !== leaseToken) {
      throw new Error("Recurring invoice generation lease expired");
    }
    if (!recurring.active) throw new Error("Recurring invoice has been stopped");
    if (recurring.endDate && occurrenceDate > recurring.endDate) {
      throw new Error("Recurring invoice has passed its end date");
    }

    if (occurrenceSnapshot.exists || invoiceSnapshot.exists) {
      const existing = invoiceSnapshot.data() as Invoice | undefined;
      if (!existing) throw new Error("Generated invoice record is incomplete");
      const shouldAdvance =
        advanceSchedule && recurring.nextGenerationDate <= occurrenceDate;
      const nextGenerationDate = shouldAdvance
        ? advanceDate(occurrenceDate, recurring.frequency)
        : recurring.nextGenerationDate;
      transaction.update(recurringRef, {
        nextGenerationDate,
        active:
          !recurring.endDate || nextGenerationDate <= recurring.endDate,
        ...(recurring.pausedUntil && occurrenceDate > recurring.pausedUntil
          ? { pausedUntil: FieldValue.delete() }
          : {}),
        leaseToken: FieldValue.delete(),
        leaseUntil: FieldValue.delete(),
        updatedAt: now(),
      });
      return existing;
    }

    const timestamp = now();
    const nextNumber =
      (sequenceSnapshot.data()?.nextNumber as number | undefined) ??
      profile.settings.nextNumber ??
      1;
    const invoice: Invoice = {
      id,
      ownerUid: recurring.ownerUid,
      profileId: profile.id,
      clientId: client.id,
      invoiceNumber: nextNumber,
      formattedNumber: formatInvoiceNumber(profile.settings.prefix, nextNumber),
      issueDate: occurrenceDate,
      dueDate: addCalendarDays(occurrenceDate, recurring.dueDateDuration),
      status: "draft",
      paymentStatus: "unpaid",
      currency: recurring.currency,
      lineItems: computed.lineItems,
      totals: computed.totals,
      notes: recurring.notes,
      paymentTerms: recurring.paymentTerms,
      templateId: recurring.templateId,
      senderSnapshot: {
        profileId: profile.id,
        displayName: profile.displayName,
        company: profile.company,
        email: profile.email,
        ...(profile.phone ? { phone: profile.phone } : {}),
        address: profile.address,
        ...(profile.logoUrl ? { logoUrl: profile.logoUrl } : {}),
      },
      clientSnapshot: {
        clientId: client.id,
        name: client.name,
        ...(client.company ? { company: client.company } : {}),
        email: client.email,
        ...(client.phone ? { phone: client.phone } : {}),
        address: client.address,
      },
      viewCount: 0,
      sentCount: 0,
      deliveryStatus: recurring.autoSend ? "pending" : "not_requested",
      recurringInvoiceId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const nextGenerationDate = advanceSchedule
      ? advanceDate(occurrenceDate, recurring.frequency)
      : recurring.nextGenerationDate;
    const remainsActive =
      !recurring.endDate || nextGenerationDate <= recurring.endDate;

    transaction.create(invoiceRef, invoice);
    transaction.create(occurrenceRef, {
      id,
      ownerUid: recurring.ownerUid,
      recurringInvoiceId,
      occurrenceDate,
      invoiceId: invoice.id,
      createdAt: timestamp,
    });
    transaction.set(
      sequenceRef,
      {
        ownerUid: recurring.ownerUid,
        profileId: profile.id,
        nextNumber: nextNumber + 1,
        updatedAt: timestamp,
      },
      { merge: true }
    );
    transaction.update(profileRef, {
      "settings.nextNumber": nextNumber + 1,
      updatedAt: timestamp,
    });
    transaction.update(recurringRef, {
      nextGenerationDate,
      lastGeneratedDate: occurrenceDate,
      active: remainsActive,
      generatedInvoiceIds: FieldValue.arrayUnion(invoice.id),
      totalGenerated: FieldValue.increment(1),
      ...(recurring.pausedUntil && occurrenceDate > recurring.pausedUntil
        ? { pausedUntil: FieldValue.delete() }
        : {}),
      leaseToken: FieldValue.delete(),
      leaseUntil: FieldValue.delete(),
      updatedAt: timestamp,
    });
    return invoice;
  });
}

function recurringPublicBaseUrl(): string {
  const value =
    process.env.INVOICE_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("INVOICE_BASE_URL is not configured");
  return value.replace(/\/$/, "");
}

async function deliverRecurringInvoice(invoice: Invoice): Promise<void> {
  if (invoice.deliveryStatus === "sent") return;
  // If the provider send and sent-count transaction succeeded but the final
  // delivery-status write failed, recover without issuing a second email.
  if (invoice.sentCount > 0 && invoice.lastSentAt) {
    await db().collection("invoices").doc(invoice.id).update({
      deliveryStatus: "sent",
      deliveryError: FieldValue.delete(),
      updatedAt: now(),
    });
    return;
  }
  const user = await getUserDoc(invoice.ownerUid);
  if (!user) throw new Error("Recurring invoice owner not found");

  try {
    const published = await publishInvoice(user, invoice.id);
    const paymentUrl = `${recurringPublicBaseUrl()}/pay/${encodeURIComponent(
      published.token
    )}`;
    const pdf = await renderInvoicePdf(
      toRenderableInvoice(published.invoice),
      paymentUrl
    );
    const deliveryKey = invoiceDeliveryKey(published.invoice);
    const messageId = await sendInvoiceEmail({
      invoice: published.invoice,
      pdf,
      paymentUrl,
      deliveryKey,
    });
    await markInvoiceSent(invoice.ownerUid, invoice.id, deliveryKey, messageId);
    await db().collection("invoices").doc(invoice.id).update({
      deliveryStatus: "sent",
      deliveryError: FieldValue.delete(),
      updatedAt: now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice delivery failed";
    await db().collection("invoices").doc(invoice.id).update({
      deliveryStatus: "failed",
      deliveryError: message.slice(0, 500),
      updatedAt: now(),
    });
    throw error;
  }
}

async function generateOccurrence(
  recurringInvoiceId: string,
  ownerUid: string | undefined,
  mode: "scheduled" | "manual"
): Promise<Invoice | null> {
  const claim = await claimRecurringSchedule(recurringInvoiceId, ownerUid);
  if (!claim) return null;
  try {
    const profile = await getInvoiceProfile(
      claim.recurring.ownerUid,
      claim.recurring.profileId
    );
    const today = localDateInTimezone(new Date(), profile.settings.timezone);
    if (
      mode === "scheduled" &&
      claim.recurring.pausedUntil &&
      today <= claim.recurring.pausedUntil
    ) {
      await releaseLease(recurringInvoiceId, claim.leaseToken);
      return null;
    }
    const occurrenceDate =
      mode === "scheduled"
        ? claim.recurring.pausedUntil &&
          today > claim.recurring.pausedUntil &&
          claim.recurring.nextGenerationDate < today
          ? today
          : claim.recurring.nextGenerationDate
        : today;
    if (
      claim.recurring.endDate &&
      occurrenceDate > claim.recurring.endDate
    ) {
      await expireClaimedSchedule(recurringInvoiceId, claim.leaseToken);
      if (mode === "manual") {
        throw new Error("Recurring invoice has passed its end date");
      }
      return null;
    }
    if (mode === "scheduled" && occurrenceDate > today) {
      await releaseLease(recurringInvoiceId, claim.leaseToken);
      return null;
    }
    const invoice = await generateClaimedOccurrence(
      recurringInvoiceId,
      occurrenceDate,
      claim.leaseToken,
      mode === "scheduled"
    );
    if (claim.recurring.autoSend && invoice.deliveryStatus !== "sent") {
      await deliverRecurringInvoice(invoice);
    }
    return invoice;
  } catch (error) {
    await releaseLease(recurringInvoiceId, claim.leaseToken).catch(() => undefined);
    throw error;
  }
}

export async function generateRecurringInvoiceNow(
  ownerUid: string,
  recurringInvoiceId: string
): Promise<Invoice> {
  const invoice = await generateOccurrence(recurringInvoiceId, ownerUid, "manual");
  if (!invoice) throw new Error("Recurring invoice is currently being generated");
  return invoice;
}

export async function runRecurringInvoiceScheduler(): Promise<SchedulerResult> {
  const horizon = addCalendarDays(new Date().toISOString().slice(0, 10), 1);
  const [snapshot, pendingDeliveries] = await Promise.all([
    db()
      .collection("recurringInvoices")
      .where("active", "==", true)
      .where("nextGenerationDate", "<=", horizon)
      .orderBy("nextGenerationDate", "asc")
      .limit(500)
      .get(),
    db()
      .collection("invoices")
      .where("deliveryStatus", "in", ["pending", "failed"])
      .limit(100)
      .get(),
  ]);
  const result: SchedulerResult = {
    scanned: snapshot.size,
    generated: 0,
    deliveriesRetried: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const document of snapshot.docs) {
    try {
      const invoice = await generateOccurrence(document.id, undefined, "scheduled");
      if (invoice) result.generated += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        recurringInvoiceId: document.id,
        error: error instanceof Error ? error.message : "Unknown generation error",
      });
    }
  }

  for (const document of pendingDeliveries.docs) {
    const invoice = document.data() as Invoice;
    if (!invoice.recurringInvoiceId) continue;
    try {
      await deliverRecurringInvoice(invoice);
      result.deliveriesRetried += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        recurringInvoiceId: invoice.recurringInvoiceId,
        error: error instanceof Error ? error.message : "Invoice delivery failed",
      });
    }
  }
  return result;
}
