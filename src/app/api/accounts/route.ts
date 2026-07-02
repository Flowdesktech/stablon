import { NextResponse } from "next/server";
import { requireUser, requireVerifiedCustomer } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { isSupportedDestination, DESTINATION_CHAINS } from "@/lib/bridge-chains";
import type { BridgeVirtualAccount } from "@/types/bridge";

// Collapse Bridge's response into the flat shape the accounts UI expects
// (account_details + currency + active/inactive status).
function normalizeVirtualAccount(va: BridgeVirtualAccount) {
  const sdi = va.source_deposit_instructions ?? {};
  const status =
    va.status === "activated" || va.status === "active" ? "active" : "inactive";
  return {
    id: va.id,
    customer_id: va.customer_id,
    status,
    currency: (sdi.currency || va.currency || "").toLowerCase(),
    destination: va.destination ?? null,
    account_details: {
      bank_name: sdi.bank_name,
      account_number: sdi.bank_account_number,
      routing_number: sdi.bank_routing_number,
      iban: sdi.iban,
      bic: sdi.bic,
    },
    created_at: va.created_at,
  };
}

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const accounts = await bridge.listVirtualAccounts(user.bridgeCustomerId);
    return NextResponse.json({
      data: (accounts.data ?? []).map(normalizeVirtualAccount),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireVerifiedCustomer();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const body = await req.json();
    const sourceCurrency = (body.currency || "usd").toLowerCase();
    const address = (body.destination_address || "").trim();
    const network = (body.destination_network || "").toLowerCase();
    const destCurrency = (body.destination_currency || "").toLowerCase();

    if (!address) {
      return NextResponse.json(
        { error: "A destination wallet address is required." },
        { status: 400 }
      );
    }
    if (!isSupportedDestination(network, destCurrency)) {
      const supported = DESTINATION_CHAINS.map((c) => c.label).join(", ");
      return NextResponse.json(
        { error: `Unsupported chain/coin. Supported networks: ${supported}.` },
        { status: 400 }
      );
    }

    const account = await bridge.createVirtualAccount(user.bridgeCustomerId!, {
      source: { currency: sourceCurrency },
      destination: {
        payment_rail: network,
        currency: destCurrency,
        address,
      },
    });

    return NextResponse.json(normalizeVirtualAccount(account), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
