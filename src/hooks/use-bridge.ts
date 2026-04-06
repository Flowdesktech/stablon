"use client";

import useSWR, { mutate as globalMutate } from "swr";

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
  const res = await fetch("/api/wallets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ network }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  globalMutate("/api/wallets");
  return data;
}

// ─── Transfers ───────────────────────────────────────────────

export function useTransfers() {
  const { data, error, isLoading, mutate } = useSWR("/api/transfers", fetcher);
  return { transfers: data?.data ?? [], error, isLoading, mutate };
}

export async function createTransfer(body: Record<string, unknown>) {
  const res = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  globalMutate("/api/transfers");
  return data;
}

// ─── Virtual Accounts ────────────────────────────────────────

export function useVirtualAccounts() {
  const { data, error, isLoading, mutate } = useSWR("/api/accounts", fetcher);
  return { accounts: data?.data ?? [], error, isLoading, mutate };
}

export async function createVirtualAccount(currency: string) {
  const res = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  globalMutate("/api/accounts");
  return data;
}

// ─── External Accounts (bank accounts for withdrawal) ────────

export function useExternalAccounts() {
  const { data, error, isLoading, mutate } = useSWR("/api/external-accounts", fetcher);
  return { bankAccounts: data?.data ?? [], error, isLoading, mutate };
}

export async function addExternalAccount(body: Record<string, unknown>) {
  const res = await fetch("/api/external-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  globalMutate("/api/external-accounts");
  return data;
}

// ─── Cards ───────────────────────────────────────────────────

export function useCards() {
  const { data, error, isLoading, mutate } = useSWR("/api/cards", fetcher);
  return { cards: data?.data ?? [], error, isLoading, mutate };
}

export async function provisionCard(settlementCurrency = "usd") {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settlement_currency: settlementCurrency }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  globalMutate("/api/cards");
  return data;
}

export function useCardTransactions(cardAccountId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    cardAccountId ? `/api/cards/${cardAccountId}/transactions` : null,
    fetcher
  );
  return { transactions: data?.data ?? [], error, isLoading };
}

export async function toggleCardFreeze(cardAccountId: string, freeze: boolean) {
  const res = await fetch(`/api/cards/${cardAccountId}/${freeze ? "freeze" : "unfreeze"}`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error);
  }
  globalMutate("/api/cards");
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
