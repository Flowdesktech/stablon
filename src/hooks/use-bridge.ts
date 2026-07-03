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

// ─── Customer / KYC ──────────────────────────────────────────

export function useCustomer() {
  const { data, error, isLoading, mutate } = useSWR("/api/customers", fetcher);
  return { customer: data, error, isLoading, mutate };
}

export async function createBridgeCustomer() {
  const res = await fetch("/api/customers", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
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
      const data = await res.json();
      throw new Error(data.error);
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
