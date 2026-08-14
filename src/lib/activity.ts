import { formatChainLabel, formatPaymentRail } from "@/lib/bridge-chains";
import type {
  ActivityItem,
  BridgeTransfer,
  BridgeVirtualAccount,
  BridgeVirtualAccountEvent,
} from "@/types/bridge";

const FIAT_RAILS = ["ach", "wire", "sepa", "pix", "spei", "fps", "faster"];

function isFiatRail(rail: string | undefined) {
  const normalized = (rail || "").toLowerCase();
  return FIAT_RAILS.some((candidate) => normalized.includes(candidate));
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

export function normalizeTransfer(transfer: BridgeTransfer): ActivityItem {
  const sourceRail = transfer.source?.payment_rail;
  const destinationRail = transfer.destination?.payment_rail;
  let type: ActivityItem["type"] = "swap";

  if (isFiatRail(sourceRail)) type = "deposit";
  else if (isFiatRail(destinationRail)) type = "withdrawal";

  let description: string;
  if (type === "deposit") {
    description = `${formatPaymentRail(sourceRail || "")} Deposit`;
  } else if (type === "withdrawal") {
    description = `${formatPaymentRail(destinationRail || "")} Withdrawal`;
  } else {
    description = `${(transfer.source?.currency || "").toUpperCase()} → ${(
      transfer.destination?.currency || ""
    ).toUpperCase()}`;
  }

  return {
    id: transfer.id,
    kind: "transfer",
    type,
    description,
    amount: transfer.amount ?? "0",
    currency: transfer.source?.currency ?? transfer.currency ?? "usd",
    destinationCurrency: transfer.destination?.currency,
    status: mapTransferStatus(transfer.state),
    created_at: transfer.created_at,
    updated_at: transfer.updated_at,
    reference: transfer.id,
    paymentRail: sourceRail ? formatPaymentRail(sourceRail) : undefined,
    destinationRail: destinationRail ? formatPaymentRail(destinationRail) : undefined,
    netAmount: transfer.destination?.amount,
    destinationAddress: transfer.destination?.to_address,
  };
}

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

// Bridge emits several lifecycle events for one virtual-account deposit. This
// collapses them into one transaction, keeping the most advanced event while
// preserving the gross amount, fees, sender, and blockchain destination.
export function normalizeOnrampEvents(
  events: BridgeVirtualAccountEvent[],
  account?: BridgeVirtualAccount
): ActivityItem[] {
  const groups = new Map<string, BridgeVirtualAccountEvent[]>();

  for (const event of events) {
    if (!LIFECYCLE_TYPES.has(event.type)) continue;
    const key = event.deposit_id || event.id;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  const destinationRail = account?.destination?.payment_rail;
  const items: ActivityItem[] = [];

  for (const [key, group] of groups) {
    const representative = group.reduce((best, event) => {
      const rank = EVENT_RANK[event.type] ?? 0;
      const bestRank = EVENT_RANK[best.type] ?? 0;
      if (rank > bestRank) return event;
      if (rank === bestRank && event.created_at > best.created_at) return event;
      return best;
    });

    const grossEvent =
      group.find((event) => event.type === "funds_received") ||
      group.find((event) => event.type === "funds_scheduled") ||
      representative;
    const paymentEvent =
      group.find((event) => event.type === "payment_processed") ||
      group.find((event) => event.type === "payment_submitted");
    const eventWithSource =
      group.find((event) => event.source?.payment_rail) || representative;
    const rail = eventWithSource.source?.payment_rail;

    items.push({
      id: key,
      kind: "onramp",
      type: "deposit",
      description: rail ? `${formatPaymentRail(rail)} Deposit` : "On-ramp Deposit",
      amount: grossEvent.amount ?? representative.amount ?? "0",
      currency: grossEvent.currency ?? "usd",
      destinationCurrency: account?.destination?.currency ?? paymentEvent?.currency,
      status: mapOnrampStatus(representative.type),
      created_at: representative.created_at,
      updated_at: representative.created_at,
      reference: key,
      paymentRail: rail ? formatPaymentRail(rail) : undefined,
      senderName: eventWithSource.source?.sender_name,
      netAmount: paymentEvent?.amount,
      subtotal: paymentEvent?.subtotal_amount ?? grossEvent.subtotal_amount,
      exchangeFee: paymentEvent?.exchange_fee_amount,
      gasFee: paymentEvent?.gas_fee,
      txHash: paymentEvent?.destination_tx_hash,
      destinationNetwork: destinationRail ? formatChainLabel(destinationRail) : undefined,
      destinationAddress: account?.destination?.address,
      depositId: representative.deposit_id,
    });
  }

  return items;
}

export function sortActivity(items: ActivityItem[]): ActivityItem[] {
  return items.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  );
}
