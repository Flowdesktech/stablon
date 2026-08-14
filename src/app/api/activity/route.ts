import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { normalizeOnrampEvents, normalizeTransfer, sortActivity } from "@/lib/activity";
import { apiError } from "@/lib/api-error";
import type { ActivityItem } from "@/types/bridge";

// Aggregating activity fans out to one Bridge history call per virtual account;
// allow more than the platform default duration so a user with several accounts
// isn't cut off mid-aggregation.
export const maxDuration = 60;

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

    const data = sortActivity([...transferItems, ...onrampItems]);

    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
