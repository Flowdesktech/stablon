import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { formatPaymentRail, formatChainLabel } from "@/lib/bridge-chains";
import { apiError } from "@/lib/api-error";
import type {
  ActivityItem,
  BridgeTransfer,
  BridgeVirtualAccount,
  BridgeVirtualAccountEvent,
} from "@/types/bridge";

const FIAT_RAILS = ["ach", "wire", "sepa", "pix", "spei", "fps", "faster"];

function isFiatRail(rail: string | undefined) {
  const r = (rail || "").toLowerCase();
  return FIAT_RAILS.some((f) => r.includes(f));
}

function mapTransferStatus(state: string): string {
  switch (state) {
    case "completed":
    case "payment_processed":
      return "completed";
    case "error":
    case "returned":
    case "canceled":
      return "error";
    case "awaiting_funds":
      return "pending";
    default:
      return "processing";
  }
}

function normalizeTransfer(t: BridgeTransfer): ActivityItem {
  const srcRail = t.source?.payment_rail;
  const dstRail = t.destination?.payment_rail;
  let type: ActivityItem["type"] = "swap";
  if (isFiatRail(srcRail)) type = "deposit";
  else if (isFiatRail(dstRail)) type = "withdrawal";

  let description: string;
  if (type === "deposit") description = `${formatPaymentRail(srcRail || "")} Deposit`;
  else if (type === "withdrawal") description = `${formatPaymentRail(dstRail || "")} Withdrawal`;
  else
    description = `${(t.source?.currency || "").toUpperCase()} → ${(t.destination?.currency || "").toUpperCase()}`;

  return {
    id: t.id,
    kind: "transfer",
    type,
    description,
    amount: t.amount ?? "0",
    currency: t.source?.currency ?? t.currency ?? "usd",
    destinationCurrency: t.destination?.currency,
    status: mapTransferStatus(t.state),
    created_at: t.created_at,
    updated_at: t.updated_at,
    reference: t.id,
    paymentRail: srcRail ? formatPaymentRail(srcRail) : undefined,
    destinationRail: dstRail ? formatPaymentRail(dstRail) : undefined,
    netAmount: t.destination?.amount,
    destinationAddress: t.destination?.to_address,
  };
}

// Lifecycle rank used to pick the most-advanced event within a single deposit.
const EVENT_RANK: Record<string, number> = {
  funds_scheduled: 1,
  funds_received: 2,
  in_review: 2,
  payment_submitted: 3,
  payment_processed: 4,
  refunded: 5,
};

const LIFECYCLE_TYPES = new Set(Object.keys(EVENT_RANK));

function mapOnrampStatus(type: string): string {
  switch (type) {
    case "payment_processed":
      return "completed";
    case "refunded":
      return "refunded";
    case "funds_scheduled":
      return "pending";
    default:
      return "processing";
  }
}

// Collapse a virtual account's lifecycle events into one activity item per
// deposit (Bridge emits funds_received → payment_submitted → payment_processed
// for the same deposit_id).
function normalizeOnrampEvents(
  events: BridgeVirtualAccountEvent[],
  account?: BridgeVirtualAccount
): ActivityItem[] {
  const groups = new Map<string, BridgeVirtualAccountEvent[]>();
  for (const ev of events) {
    if (!LIFECYCLE_TYPES.has(ev.type)) continue;
    const key = ev.deposit_id || ev.id;
    const list = groups.get(key) ?? [];
    list.push(ev);
    groups.set(key, list);
  }

  const destRail = account?.destination?.payment_rail;
  const items: ActivityItem[] = [];
  for (const [key, list] of groups) {
    // Representative = furthest along the lifecycle (latest on ties).
    const rep = list.reduce((best, ev) => {
      const r = EVENT_RANK[ev.type] ?? 0;
      const bestR = EVENT_RANK[best.type] ?? 0;
      if (r > bestR) return ev;
      if (r === bestR && ev.created_at > best.created_at) return ev;
      return best;
    });

    // Gross fiat amount comes from the incoming-funds event when present.
    const grossEvent =
      list.find((e) => e.type === "funds_received") ||
      list.find((e) => e.type === "funds_scheduled") ||
      rep;
    // The on-chain payment carries fee breakdown + tx hash + net amount.
    const paymentEvent =
      list.find((e) => e.type === "payment_processed") ||
      list.find((e) => e.type === "payment_submitted");
    const withSource = list.find((e) => e.source?.payment_rail) || rep;
    const rail = withSource.source?.payment_rail;

    items.push({
      id: key,
      kind: "onramp",
      type: "deposit",
      description: rail ? `${formatPaymentRail(rail)} Deposit` : "On-ramp Deposit",
      amount: grossEvent.amount ?? rep.amount ?? "0",
      currency: grossEvent.currency ?? "usd",
      destinationCurrency: account?.destination?.currency ?? paymentEvent?.currency,
      status: mapOnrampStatus(rep.type),
      created_at: rep.created_at,
      updated_at: rep.created_at,
      reference: key,
      paymentRail: rail ? formatPaymentRail(rail) : undefined,
      senderName: withSource.source?.sender_name,
      netAmount: paymentEvent?.amount,
      subtotal: paymentEvent?.subtotal_amount ?? grossEvent.subtotal_amount,
      exchangeFee: paymentEvent?.exchange_fee_amount,
      gasFee: paymentEvent?.gas_fee,
      txHash: paymentEvent?.destination_tx_hash,
      destinationNetwork: destRail ? formatChainLabel(destRail) : undefined,
      destinationAddress: account?.destination?.address,
      depositId: rep.deposit_id,
    });
  }
  return items;
}

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }
    const customerId = user.bridgeCustomerId;

    const [transfersRes, accountsRes] = await Promise.all([
      bridge.listTransfers(customerId).catch(() => ({ data: [] })),
      bridge.listVirtualAccounts(customerId).catch(() => ({ data: [] })),
    ]);

    const transferItems = (transfersRes.data ?? []).map(normalizeTransfer);

    const accounts = accountsRes.data ?? [];
    const historyResults = await Promise.allSettled(
      accounts.map((va) => bridge.getVirtualAccountHistory(customerId, va.id))
    );

    const onrampItems: ActivityItem[] = [];
    historyResults.forEach((res, i) => {
      if (res.status !== "fulfilled") return;
      onrampItems.push(...normalizeOnrampEvents(res.value.data ?? [], accounts[i]));
    });

    const data = [...transferItems, ...onrampItems].sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
    );

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
