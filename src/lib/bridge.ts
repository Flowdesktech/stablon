import type {
  AppKycStatus,
  BridgeCustomer,
  BridgeKYCLink,
  BridgeWallet,
  BridgeTransfer,
  BridgeVirtualAccount,
  BridgeVirtualAccountEvent,
  BridgeCardAccount,
  BridgeCardTransaction,
  BridgeExternalAccount,
  BridgeExchangeRate,
  BridgeRewardsSummary,
  DirectKycPayload,
  OccupationCode,
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

// True when a Bridge call failed because the resource no longer exists (e.g. a
// customer that was deleted/offboarded on Bridge's side). Callers use this to
// self-heal by unlinking the stale customer id.
export function isBridgeNotFound(error: unknown): boolean {
  return error instanceof BridgeError && error.status === 404;
}

// True when we aborted the request because Bridge took too long to respond.
export function isBridgeTimeout(error: unknown): boolean {
  return error instanceof BridgeError && error.status === 504;
}

// True when the request body exceeded Bridge's (or its gateway's) size limit.
// This surfaces as a 413, or a 500 whose body mentions "entity too large" — the
// latter happens with oversized base64 document images on the Customers API.
export function isBridgePayloadTooLarge(error: unknown): boolean {
  if (!(error instanceof BridgeError)) return false;
  if (error.status === 413) return true;
  const parts: string[] = [error.message];
  if (typeof error.body === "string") parts.push(error.body);
  else if (error.body && typeof error.body === "object") {
    const message = (error.body as { message?: unknown }).message;
    if (typeof message === "string") parts.push(message);
  }
  const text = parts.join(" ").toLowerCase();
  return text.includes("entity too large") || text.includes("payload too large");
}

// Extracts Bridge's human-readable message from an error, falling back to the
// generic error text. Avoids leaking the raw `Bridge API 401: {json}` blob.
//
// For `invalid_parameters` the top-level `message` is generic ("Please resubmit
// the following parameters…"), while the useful detail (e.g. an approval notice)
// lives under `source.key.<field>` — so we prefer a descriptive field message.
export function bridgeErrorMessage(error: unknown): string {
  if (error instanceof BridgeError) {
    // Actionable messages for the two failure modes callers can recover from.
    if (isBridgePayloadTooLarge(error)) {
      return "Your uploaded files are too large. Please upload smaller, compressed images (under 5 MB each) and try again.";
    }
    if (isBridgeTimeout(error)) {
      return "The request timed out. Large photo uploads can take a while — please try smaller images or try again in a moment.";
    }

    const body =
      error.body && typeof error.body === "object"
        ? (error.body as { message?: string; source?: { key?: Record<string, unknown> } })
        : undefined;

    const keyValues = body?.source?.key ? Object.values(body.source.key) : [];
    const descriptive = keyValues.find(
      (v): v is string => typeof v === "string" && v.trim().length > 25
    );
    if (descriptive) return descriptive;

    if (body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }

    // Opaque / non-JSON body (e.g. an HTML gateway error) — don't leak the raw
    // `Bridge API 500: <blob>` string to the user.
    if (error.status >= 500) {
      return "Our verification provider is temporarily unavailable. Please try again in a moment.";
    }
    return "Something went wrong with that request. Please check your details and try again.";
  }
  return error instanceof Error ? error.message : "Internal error";
}

// Default ceiling for a Bridge round-trip. Endpoints with large uploads (KYC
// document images) pass a longer timeout via `timeoutMs`.
const DEFAULT_TIMEOUT_MS = 30_000;

async function bridgeFetch<T>(
  path: string,
  options: RequestInit = {},
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Api-Key": API_KEY,
  };

  // Bridge requires an Idempotency-Key on POST requests. PUT endpoints reject
  // the header ("Cannot set Idempotency-Key on this request"), so it's POST-only.
  if (method === "POST") {
    baseHeaders["Idempotency-Key"] = crypto.randomUUID();
  }

  // Abort the request if Bridge doesn't respond in time so callers get a clean
  // 504 rather than a hung request.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...baseHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BridgeError(504, { message: "Request timed out" }, "Request timed out");
    }
    // Network-level failure (DNS, connection reset, etc.).
    throw new BridgeError(
      502,
      { message: "Could not reach the verification provider" },
      err instanceof Error ? err.message : "Network error"
    );
  } finally {
    clearTimeout(timer);
  }

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

// Bridge exposes a granular `status` on the customer (and `active` = approved).
// Collapse it into the app's KYC vocabulary. Falls back to a legacy `kyc_status`
// field if Bridge ever returns one.
export function deriveKycStatus(
  customer: { status?: string; kyc_status?: string } | null | undefined
): AppKycStatus {
  const raw = customer?.status ?? customer?.kyc_status;
  switch (raw) {
    case "active":
    case "approved":
      return "approved";
    case "rejected":
    case "offboarded":
      return "rejected";
    case "under_review":
    case "pending":
    case "awaiting_questionnaire":
    case "awaiting_ubo":
    case "paused":
      return "pending";
    // Customer created and part-way through — Bridge still needs action from
    // them (e.g. a government ID document). Surfaced to the user as "action needed".
    case "incomplete":
      return "incomplete";
    default:
      return "not_started";
  }
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

// Hosted KYC link for a customer that already exists (created via /customers).
// Passing `endorsement=sepa` enables the proof-of-address step required for
// EUR/SEPA rails.
export async function getCustomerKycLink(
  customerId: string,
  endorsement?: string
): Promise<BridgeKYCLink> {
  const query = endorsement ? `?endorsement=${encodeURIComponent(endorsement)}` : "";
  return bridgeFetch<BridgeKYCLink>(`/customers/${customerId}/kyc_link${query}`);
}

// Terms-of-Service acceptance link for an existing customer.
export async function getCustomerTosLink(
  customerId: string
): Promise<{ url: string }> {
  return bridgeFetch<{ url: string }>(`/customers/${customerId}/tos_acceptance_link`);
}

// Hosted ToS acceptance URL for a NEW customer (before the customer exists).
// The returned page redirects back to `redirectUri` with a `signed_agreement_id`
// query param once the user accepts — that id is required to create a customer
// via the direct Customers API.
export async function createTosLink(
  redirectUri?: string
): Promise<{ url: string }> {
  const res = await bridgeFetch<{ url: string }>("/customers/tos_links", {
    method: "POST",
  });
  if (redirectUri && res.url) {
    const sep = res.url.includes("?") ? "&" : "?";
    return { url: `${res.url}${sep}redirect_uri=${encodeURIComponent(redirectUri)}` };
  }
  return res;
}

// Valid occupation codes for the `most_recent_occupation` KYC field.
export async function getOccupationCodes(): Promise<OccupationCode[]> {
  return bridgeFetch<OccupationCode[]>("/lists/occupation_codes");
}

// Submits KYC data straight to Bridge. Creates the customer when none is linked
// yet, otherwise updates the existing one (a full payload is required — Bridge
// only allows partial updates for a small field subset). Returns the customer
// with its fresh kyc_status / endorsements.
export async function submitDirectKyc(
  customerId: string | null,
  payload: DirectKycPayload
): Promise<BridgeCustomer> {
  // Document images can make this payload large, so allow extra time.
  const timeout = { timeoutMs: 60_000 };
  if (customerId) {
    return bridgeFetch<BridgeCustomer>(
      `/customers/${customerId}`,
      { method: "PUT", body: JSON.stringify(payload) },
      timeout
    );
  }
  return bridgeFetch<BridgeCustomer>(
    "/customers",
    { method: "POST", body: JSON.stringify(payload) },
    timeout
  );
}

// ─── Wallets ─────────────────────────────────────────────────

// Bridge's wallet API speaks `chain`; the rest of the app uses `network`, so we
// translate on the way in and normalize `chain` → `network` on the way out.
function normalizeWallet(wallet: BridgeWallet & { chain?: string }): BridgeWallet {
  return {
    ...wallet,
    network: wallet.network ?? wallet.chain ?? "",
    balances: wallet.balances ?? {},
  };
}

export async function createWallet(
  customerId: string,
  data: { network: string }
): Promise<BridgeWallet> {
  const wallet = await bridgeFetch<BridgeWallet>(
    `/customers/${customerId}/wallets`,
    { method: "POST", body: JSON.stringify({ chain: data.network }) }
  );
  return normalizeWallet(wallet);
}

export async function getWallets(
  customerId: string
): Promise<{ data: BridgeWallet[] }> {
  const res = await bridgeFetch<{ data: BridgeWallet[] }>(
    `/customers/${customerId}/wallets`
  );
  return { data: (res.data ?? []).map(normalizeWallet) };
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

// A virtual account is a permanent fiat deposit account (bank details / IBAN)
// that auto-converts incoming fiat into stablecoin and delivers it to the given
// destination — so both `source` and `destination` are required by Bridge.
export async function createVirtualAccount(
  customerId: string,
  data: {
    source: { currency: string };
    destination: {
      payment_rail: string;
      currency: string;
      address?: string;
      bridge_wallet_id?: string;
    };
    developer_fee_percent?: string;
  }
): Promise<BridgeVirtualAccount> {
  return bridgeFetch<BridgeVirtualAccount>(
    `/customers/${customerId}/virtual_accounts`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function updateVirtualAccount(
  customerId: string,
  virtualAccountId: string,
  data: {
    destination: {
      payment_rail?: string;
      currency?: string;
      address?: string;
      bridge_wallet_id?: string;
    };
  }
): Promise<BridgeVirtualAccount> {
  return bridgeFetch<BridgeVirtualAccount>(
    `/customers/${customerId}/virtual_accounts/${virtualAccountId}`,
    { method: "PUT", body: JSON.stringify(data) }
  );
}

export async function listVirtualAccounts(
  customerId: string
): Promise<{ data: BridgeVirtualAccount[] }> {
  return bridgeFetch<{ data: BridgeVirtualAccount[] }>(
    `/customers/${customerId}/virtual_accounts`
  );
}

// History of on-ramp lifecycle events for a single virtual account
// (funds_received, payment_submitted, payment_processed, refunded, …).
export async function getVirtualAccountHistory(
  customerId: string,
  virtualAccountId: string
): Promise<{ count?: number; data: BridgeVirtualAccountEvent[] }> {
  return bridgeFetch<{ count?: number; data: BridgeVirtualAccountEvent[] }>(
    `/customers/${customerId}/virtual_accounts/${virtualAccountId}/history`
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
