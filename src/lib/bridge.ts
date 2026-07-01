import type {
  BridgeCustomer,
  BridgeKYCLink,
  BridgeWallet,
  BridgeTransfer,
  BridgeVirtualAccount,
  BridgeCardAccount,
  BridgeCardTransaction,
  BridgeExternalAccount,
  BridgeExchangeRate,
  BridgeRewardsSummary,
} from "@/types/bridge";

const API_URL = process.env.BRIDGE_API_URL || "https://api.bridge.xyz/v0";
const API_KEY = process.env.BRIDGE_API_KEY || "";

export class BridgeError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, rawText: string) {
    super(`Bridge API ${status}: ${rawText}`);
    this.name = "BridgeError";
    this.status = status;
    this.body = body;
  }
}

async function bridgeFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Api-Key": API_KEY,
  };

  // Bridge requires an Idempotency-Key on all mutating (POST) requests.
  if (method === "POST") {
    baseHeaders["Idempotency-Key"] = crypto.randomUUID();
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const rawText = await res.text();
    let parsed: unknown = rawText;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // keep raw text
    }
    throw new BridgeError(res.status, parsed, rawText);
  }

  return res.json();
}

// ─── Customers ───────────────────────────────────────────────

export async function createCustomer(data: {
  full_name: string;
  email: string;
  type: "individual" | "business";
}): Promise<BridgeCustomer> {
  return bridgeFetch<BridgeCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCustomer(
  customerId: string
): Promise<BridgeCustomer> {
  return bridgeFetch<BridgeCustomer>(`/customers/${customerId}`);
}

export async function listCustomers(): Promise<{ data: BridgeCustomer[] }> {
  return bridgeFetch<{ data: BridgeCustomer[] }>("/customers");
}

// ─── KYC ─────────────────────────────────────────────────────

export async function createKYCLink(data: {
  full_name: string;
  email: string;
  type: "individual" | "business";
}): Promise<BridgeKYCLink> {
  try {
    return await bridgeFetch<BridgeKYCLink>("/kyc_links", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Bridge returns 400 duplicate_record when a KYC link already exists for
    // this email, but includes the existing link for reuse.
    if (error instanceof BridgeError && error.status === 400) {
      const body = error.body as { code?: string; existing_kyc_link?: BridgeKYCLink } | null;
      if (body?.code === "duplicate_record" && body.existing_kyc_link) {
        return body.existing_kyc_link;
      }
    }
    throw error;
  }
}

export async function getKYCLinkStatus(
  kycLinkId: string
): Promise<BridgeKYCLink> {
  return bridgeFetch<BridgeKYCLink>(`/kyc_links/${kycLinkId}`);
}

// ─── Wallets ─────────────────────────────────────────────────

export async function createWallet(
  customerId: string,
  data: { network: string }
): Promise<BridgeWallet> {
  return bridgeFetch<BridgeWallet>(
    `/customers/${customerId}/wallets`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function getWallets(
  customerId: string
): Promise<{ data: BridgeWallet[] }> {
  return bridgeFetch<{ data: BridgeWallet[] }>(
    `/customers/${customerId}/wallets`
  );
}

export async function getWallet(walletId: string): Promise<BridgeWallet> {
  return bridgeFetch<BridgeWallet>(`/wallets/${walletId}`);
}

export async function getWalletTransactions(
  walletId: string
): Promise<{ data: BridgeTransfer[] }> {
  return bridgeFetch<{ data: BridgeTransfer[] }>(
    `/wallets/${walletId}/transactions`
  );
}

export async function getTotalWalletBalances(): Promise<
  Record<string, string>
> {
  return bridgeFetch<Record<string, string>>("/wallets/balances");
}

// ─── Transfers / Orchestration ───────────────────────────────

export async function createTransfer(data: {
  amount: string;
  on_behalf_of: string;
  developer_fee?: string;
  source: {
    payment_rail: string;
    currency: string;
    external_account_id?: string;
    from_address?: string;
  };
  destination: {
    payment_rail: string;
    currency: string;
    external_account_id?: string;
    to_address?: string;
    bridge_wallet_id?: string;
  };
}): Promise<BridgeTransfer> {
  return bridgeFetch<BridgeTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTransfer(
  transferId: string
): Promise<BridgeTransfer> {
  return bridgeFetch<BridgeTransfer>(`/transfers/${transferId}`);
}

export async function listTransfers(
  customerId?: string
): Promise<{ data: BridgeTransfer[] }> {
  const path = customerId
    ? `/customers/${customerId}/transfers`
    : "/transfers";
  return bridgeFetch<{ data: BridgeTransfer[] }>(path);
}

// ─── Virtual Accounts ────────────────────────────────────────

export async function createVirtualAccount(
  customerId: string,
  data: { currency: string }
): Promise<BridgeVirtualAccount> {
  return bridgeFetch<BridgeVirtualAccount>(
    `/customers/${customerId}/virtual_accounts`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function listVirtualAccounts(
  customerId: string
): Promise<{ data: BridgeVirtualAccount[] }> {
  return bridgeFetch<{ data: BridgeVirtualAccount[] }>(
    `/customers/${customerId}/virtual_accounts`
  );
}

export async function getVirtualAccountActivity(
  virtualAccountId: string
): Promise<{ data: unknown[] }> {
  return bridgeFetch<{ data: unknown[] }>(
    `/virtual_accounts/${virtualAccountId}/activity`
  );
}

// ─── External Accounts ───────────────────────────────────────

export async function createExternalAccount(
  customerId: string,
  data: {
    currency: string;
    bank_name: string;
    account_owner_name: string;
    account_type: string;
    account_number?: string;
    routing_number?: string;
    iban?: string;
    bic?: string;
  }
): Promise<BridgeExternalAccount> {
  return bridgeFetch<BridgeExternalAccount>(
    `/customers/${customerId}/external_accounts`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function listExternalAccounts(
  customerId: string
): Promise<{ data: BridgeExternalAccount[] }> {
  return bridgeFetch<{ data: BridgeExternalAccount[] }>(
    `/customers/${customerId}/external_accounts`
  );
}

// ─── Cards ───────────────────────────────────────────────────

export async function provisionCard(
  customerId: string,
  data: { settlement_currency?: string }
): Promise<BridgeCardAccount> {
  return bridgeFetch<BridgeCardAccount>(
    `/customers/${customerId}/card_accounts`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function getCardAccounts(
  customerId: string
): Promise<{ data: BridgeCardAccount[] }> {
  return bridgeFetch<{ data: BridgeCardAccount[] }>(
    `/customers/${customerId}/card_accounts`
  );
}

export async function freezeCard(cardAccountId: string): Promise<void> {
  await bridgeFetch(`/card_accounts/${cardAccountId}/freeze`, {
    method: "POST",
  });
}

export async function unfreezeCard(cardAccountId: string): Promise<void> {
  await bridgeFetch(`/card_accounts/${cardAccountId}/unfreeze`, {
    method: "POST",
  });
}

export async function getCardTransactions(
  cardAccountId: string
): Promise<{ data: BridgeCardTransaction[] }> {
  return bridgeFetch<{ data: BridgeCardTransaction[] }>(
    `/card_accounts/${cardAccountId}/transactions`
  );
}

// ─── Exchange Rates ──────────────────────────────────────────

export async function getExchangeRate(
  from: string,
  to: string
): Promise<BridgeExchangeRate> {
  return bridgeFetch<BridgeExchangeRate>(
    `/exchange_rates?from=${from}&to=${to}`
  );
}

// ─── Rewards ─────────────────────────────────────────────────

export async function getRewardsSummary(
  customerId: string
): Promise<BridgeRewardsSummary> {
  return bridgeFetch<BridgeRewardsSummary>(
    `/customers/${customerId}/rewards/summary`
  );
}

export async function getRewardsHistory(
  customerId: string
): Promise<{ data: unknown[] }> {
  return bridgeFetch<{ data: unknown[] }>(
    `/customers/${customerId}/rewards`
  );
}
