"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "@/components/ui/toast";

function notifyError(title: string, err: unknown) {
  toast({
    variant: "error",
    title,
    description: err instanceof Error ? err.message : "Please try again.",
  });
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

// Parse a mutation response defensively: a proxy/gateway can reject a large
// upload or a long-running call with a non-JSON (HTML) body, which would make
// `res.json()` throw an opaque "Unexpected token" instead of a useful message.
async function readJson<T = Record<string, unknown>>(res: Response): Promise<{ error?: string } & T> {
  return res.json().catch(() => ({}) as { error?: string } & T);
}

// Human-readable fallback for a failed mutation when no `error` field came back.
function mutationErrorMessage(res: Response, data: { error?: string }, fallback: string): string {
  if (data.error) return data.error;
  if (res.status === 413)
    return "Your uploaded files are too large. Please upload smaller images and try again.";
  if (res.status === 504) return "The request timed out. Please try again.";
  if (res.status === 401 || res.status === 403) return "Your session has expired. Please sign in again.";
  if (res.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return fallback;
}

// ─── Customer / KYC ──────────────────────────────────────────

export function useCustomer() {
  const { data, error, isLoading, mutate } = useSWR("/api/customers", fetcher);
  return { customer: data, error, isLoading, mutate };
}

export async function createBridgeCustomer() {
  const res = await fetch("/api/customers", { method: "POST" });
  const data = await readJson(res);
  if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't set up your account"));
  globalMutate("/api/customers");
  return data;
}

export function useKycStatus() {
  const { customer, isLoading } = useCustomer();
  const status: string = customer?.kyc_status ?? "none";
  return { status, isApproved: status === "approved", isLoading };
}

export function useKYCLink() {
  const { data, error, isLoading, mutate } = useSWR("/api/kyc", fetcher);
  return { kycLink: data, error, isLoading, mutate };
}

export async function startKYC() {
  const res = await fetch("/api/kyc", { method: "POST" });
  const data = await readJson<{
    customer_id?: string;
    kyc_link?: string;
    tos_link?: string | null;
    tos_accepted?: boolean;
    kyc_status?: string;
  }>(res);
  if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't load verification"));
  globalMutate("/api/kyc");
  return data;
}

// Direct (API-based) KYC: request a hosted Terms-of-Service URL that redirects
// back to `redirectUri` with a signed_agreement_id.
export async function requestTosLink(redirectUri: string): Promise<string> {
  const res = await fetch("/api/kyc/tos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uri: redirectUri }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't start Terms of Service"));
  return data.url as string;
}

// Bridge's occupation code list for the advanced-KYC occupation field.
export function useOccupationCodes() {
  const { data, error, isLoading } = useSWR("/api/kyc/occupations", fetcher, {
    revalidateOnFocus: false,
  });
  return {
    occupations: (data?.data ?? []) as { display_name: string; code: string }[],
    error,
    isLoading,
  };
}

// Submit the in-app KYC form straight to Bridge.
export async function submitDirectKyc(payload: Record<string, unknown>) {
  const res = await fetch("/api/kyc/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Verification failed. Please try again."));
  globalMutate("/api/customers");
  globalMutate("/api/kyc");
  return data;
}

// ─── Wallets ─────────────────────────────────────────────────

export function useWallets() {
  const { data, error, isLoading, mutate } = useSWR("/api/wallets", fetcher);
  return { wallets: data?.data ?? [], error, isLoading, mutate };
}

export async function createWallet(network: string) {
  try {
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't create wallet"));
    globalMutate("/api/wallets");
    toast({ variant: "success", title: "Wallet created", description: `Your ${network} wallet is ready.` });
    return data;
  } catch (err) {
    notifyError("Couldn't create wallet", err);
    throw err;
  }
}

// ─── Transfers ───────────────────────────────────────────────

export function useTransfers() {
  const { data, error, isLoading, mutate } = useSWR("/api/transfers", fetcher);
  return { transfers: data?.data ?? [], error, isLoading, mutate };
}

// Unified activity feed: Bridge transfers + virtual-account on-ramp events.
export function useActivity() {
  const { data, error, isLoading, mutate } = useSWR("/api/activity", fetcher);
  return { activity: data?.data ?? [], error, isLoading, mutate };
}

export async function createTransfer(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Transfer failed"));
    globalMutate("/api/transfers");
    toast({ variant: "success", title: "Transfer initiated", description: "Track its progress in your activity." });
    return data;
  } catch (err) {
    notifyError("Transfer failed", err);
    throw err;
  }
}

// ─── Virtual Accounts ────────────────────────────────────────

export function useVirtualAccounts() {
  const { data, error, isLoading, mutate } = useSWR("/api/accounts", fetcher);
  return { accounts: data?.data ?? [], error, isLoading, mutate };
}

export async function createVirtualAccount(params: {
  currency: string;
  destinationAddress: string;
  destinationNetwork: string;
  destinationCurrency: string;
}) {
  try {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currency: params.currency,
        destination_address: params.destinationAddress.trim(),
        destination_network: params.destinationNetwork,
        destination_currency: params.destinationCurrency,
      }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't create account"));
    globalMutate("/api/accounts");
    toast({ variant: "success", title: "Account created", description: `Your ${params.currency.toUpperCase()} account is ready.` });
    return data;
  } catch (err) {
    notifyError("Couldn't create account", err);
    throw err;
  }
}

export async function updateVirtualAccountDestination(params: {
  id: string;
  destinationAddress: string;
  destinationNetwork: string;
  destinationCurrency: string;
}) {
  try {
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.id,
        destination_address: params.destinationAddress.trim(),
        destination_network: params.destinationNetwork,
        destination_currency: params.destinationCurrency,
      }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't update destination"));
    globalMutate("/api/accounts");
    toast({ variant: "success", title: "Destination updated", description: "Incoming deposits will settle to the new address." });
    return data;
  } catch (err) {
    notifyError("Couldn't update destination", err);
    throw err;
  }
}

// ─── External Accounts (bank accounts for withdrawal) ────────

export function useExternalAccounts() {
  const { data, error, isLoading, mutate } = useSWR("/api/external-accounts", fetcher);
  return { bankAccounts: data?.data ?? [], error, isLoading, mutate };
}

export async function addExternalAccount(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/external-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't add bank account"));
    globalMutate("/api/external-accounts");
    toast({ variant: "success", title: "Bank account added", description: "You can now withdraw to this account." });
    return data;
  } catch (err) {
    notifyError("Couldn't add bank account", err);
    throw err;
  }
}

// ─── Cards ───────────────────────────────────────────────────

export function useCards() {
  const { data, error, isLoading, mutate } = useSWR("/api/cards", fetcher);
  return { cards: data?.data ?? [], error, isLoading, mutate };
}

export async function provisionCard(settlementCurrency = "usd") {
  try {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlement_currency: settlementCurrency }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(mutationErrorMessage(res, data, "Couldn't issue card"));
    globalMutate("/api/cards");
    toast({ variant: "success", title: "Card issued", description: "Your new card is ready to use." });
    return data;
  } catch (err) {
    notifyError("Couldn't issue card", err);
    throw err;
  }
}

export function useCardTransactions(cardAccountId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    cardAccountId ? `/api/cards/${cardAccountId}/transactions` : null,
    fetcher
  );
  return { transactions: data?.data ?? [], error, isLoading };
}

export async function toggleCardFreeze(cardAccountId: string, freeze: boolean) {
  try {
    const res = await fetch(`/api/cards/${cardAccountId}/${freeze ? "freeze" : "unfreeze"}`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(mutationErrorMessage(res, data, freeze ? "Couldn't freeze card" : "Couldn't unfreeze card"));
    }
    globalMutate("/api/cards");
    toast({
      variant: freeze ? "info" : "success",
      title: freeze ? "Card frozen" : "Card unfrozen",
      description: freeze ? "Transactions are now blocked." : "Your card is active again.",
    });
  } catch (err) {
    notifyError(freeze ? "Couldn't freeze card" : "Couldn't unfreeze card", err);
    throw err;
  }
}

// ─── Exchange Rates ──────────────────────────────────────────

export function useExchangeRate(from: string, to: string) {
  const { data, error, isLoading } = useSWR(
    `/api/rates?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  return { rate: data, error, isLoading };
}

// ─── Rewards ─────────────────────────────────────────────────

export function useRewards() {
  const { data, error, isLoading } = useSWR("/api/rewards", fetcher);
  return { rewards: data, error, isLoading };
}

export function useRewardsHistory() {
  const { data, error, isLoading } = useSWR("/api/rewards/history", fetcher);
  return { history: data?.data ?? [], error, isLoading };
}
