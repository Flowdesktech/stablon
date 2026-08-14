import { NextResponse } from "next/server";
import { normalizeOnrampEvents, normalizeTransfer } from "@/lib/activity";
import { apiError } from "@/lib/api-error";
import { requireSuperAdmin } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ActivityItem, BridgeVirtualAccountEvent } from "@/types/bridge";

export const maxDuration = 60;

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

interface AdminCursor {
  transferCursor?: string;
  eventCursor?: string;
  transfersDone: boolean;
  eventsDone: boolean;
}

interface TransactionOwner {
  uid: string | null;
  email: string;
  name: string | null;
  customerId: string;
}

interface AdminActivityItem extends ActivityItem {
  owner: TransactionOwner;
}

function decodeCursor(value: string | null): AdminCursor | null {
  if (!value) {
    return {
      transfersDone: false,
      eventsDone: false,
    };
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminCursor>;
    if (
      typeof parsed.transfersDone !== "boolean" ||
      typeof parsed.eventsDone !== "boolean"
    ) {
      return null;
    }
    return {
      transferCursor:
        typeof parsed.transferCursor === "string" ? parsed.transferCursor : undefined,
      eventCursor: typeof parsed.eventCursor === "string" ? parsed.eventCursor : undefined,
      transfersDone: parsed.transfersDone,
      eventsDone: parsed.eventsDone,
    };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: AdminCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function ownerFor(
  owners: Map<string, TransactionOwner>,
  customerId: string
): TransactionOwner {
  return (
    owners.get(customerId) ?? {
      uid: null,
      email: "",
      name: null,
      customerId,
    }
  );
}

function normalizeAdminOnramps(
  events: BridgeVirtualAccountEvent[],
  owners: Map<string, TransactionOwner>
): AdminActivityItem[] {
  // Keep customers separate while collapsing lifecycle events so the resulting
  // transaction can always be attributed to the correct user.
  const byCustomer = new Map<string, BridgeVirtualAccountEvent[]>();
  for (const event of events) {
    const group = byCustomer.get(event.customer_id) ?? [];
    group.push(event);
    byCustomer.set(event.customer_id, group);
  }

  const items: AdminActivityItem[] = [];
  for (const [customerId, customerEvents] of byCustomer) {
    items.push(
      ...normalizeOnrampEvents(customerEvents).map((item) => ({
        ...item,
        owner: ownerFor(owners, customerId),
      }))
    );
  }
  return items;
}

export async function GET(request: Request) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const url = new URL(request.url);
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (!cursor) {
    return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
  }

  const requestedLimit = Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE;
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(requestedLimit)));

  try {
    const usersSnapshot = await getAdminDb().collection("users").get();
    const owners = new Map<string, TransactionOwner>();

    for (const document of usersSnapshot.docs) {
      const data = document.data();
      const customerId =
        typeof data.bridgeCustomerId === "string" ? data.bridgeCustomerId : "";
      if (!customerId) continue;

      owners.set(customerId, {
        uid: document.id,
        email: typeof data.email === "string" ? data.email : "",
        name: typeof data.name === "string" ? data.name : null,
        customerId,
      });
    }

    const [transfersResponse, eventsResponse] = await Promise.all([
      cursor.transfersDone
        ? Promise.resolve({ data: [] })
        : bridge.listTransfers(undefined, {
            limit,
            startingAfter: cursor.transferCursor,
          }),
      cursor.eventsDone
        ? Promise.resolve({ data: [] })
        : bridge.listVirtualAccountHistory({
            limit,
            startingAfter: cursor.eventCursor,
          }),
    ]);

    const transfers = transfersResponse.data ?? [];
    const events = eventsResponse.data ?? [];

    const transferItems: AdminActivityItem[] = transfers.map((transfer) => ({
      ...normalizeTransfer(transfer),
      owner: ownerFor(owners, transfer.customer_id || transfer.on_behalf_of || ""),
    }));
    const onrampItems = normalizeAdminOnramps(events, owners);

    const data = [...transferItems, ...onrampItems].sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
    );

    const nextState: AdminCursor = {
      transferCursor:
        transfers.at(-1)?.id ?? cursor.transferCursor,
      eventCursor: events.at(-1)?.id ?? cursor.eventCursor,
      transfersDone: cursor.transfersDone || transfers.length < limit,
      eventsDone: cursor.eventsDone || events.length < limit,
    };
    const hasMore = !nextState.transfersDone || !nextState.eventsDone;

    return NextResponse.json({
      data,
      nextCursor: hasMore ? encodeCursor(nextState) : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
