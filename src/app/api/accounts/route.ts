import { NextResponse } from "next/server";
import { requireUser, requireVerifiedCustomer } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { isSupportedDestination, DESTINATION_CHAINS } from "@/lib/bridge-chains";
import { apiError } from "@/lib/api-error";
import type { BridgeVirtualAccount, AppVirtualAccount } from "@/types/bridge";

// Developer fee (percent) taken on incoming virtual-account deposits.
// Configurable via env; defaults to 1%.
const DEVELOPER_FEE_PERCENT = process.env.BRIDGE_DEVELOPER_FEE_PERCENT || "0";

// Collapse Bridge's response into the flat shape the UI consumes, keeping all
// the deposit + source + destination detail the customer needs.
function normalizeVirtualAccount(va: BridgeVirtualAccount): AppVirtualAccount {
  const sdi = va.source_deposit_instructions ?? {};
  const status =
    va.status === "activated" || va.status === "active" ? "active" : "inactive";
  const rails = sdi.payment_rails ?? (sdi.payment_rail ? [sdi.payment_rail] : []);

  return {
    id: va.id,
    customer_id: va.customer_id,
    status,
    currency: (sdi.currency || va.currency || "").toLowerCase(),
    payment_rails: rails,
    account_details: {
      bank_name: sdi.bank_name,
      beneficiary_name: sdi.bank_beneficiary_name || sdi.account_holder_name,
      beneficiary_address: sdi.bank_beneficiary_address || sdi.bank_address,
      account_number: sdi.bank_account_number || sdi.account_number,
      routing_number: sdi.bank_routing_number || sdi.sort_code,
      iban: sdi.iban,
      bic: sdi.bic,
    },
    destination: va.destination
      ? {
          payment_rail: va.destination.payment_rail,
          currency: va.destination.currency,
          address: va.destination.address,
          bridge_wallet_id: va.destination.bridge_wallet_id,
        }
      : null,
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
    return apiError(error);
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
      developer_fee_percent: DEVELOPER_FEE_PERCENT,
    });

    return NextResponse.json(normalizeVirtualAccount(account), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireVerifiedCustomer();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const body = await req.json();
    const id = (body.id || "").trim();
    const address = (body.destination_address || "").trim();
    const network = (body.destination_network || "").toLowerCase();
    const destCurrency = (body.destination_currency || "").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "Account id is required." }, { status: 400 });
    }
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

    const account = await bridge.updateVirtualAccount(user.bridgeCustomerId!, id, {
      destination: {
        payment_rail: network,
        currency: destCurrency,
        address,
      },
    });

    return NextResponse.json(normalizeVirtualAccount(account));
  } catch (error) {
    return apiError(error);
  }
}
