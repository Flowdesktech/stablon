"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, StatCard } from "@/components/ui/page";
import type { BridgeWallet } from "@/types/bridge";
import { Network, Users, Wallet } from "lucide-react";

interface AdminWallet extends BridgeWallet {
  owner: { uid: string; email: string; name: string | null };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

function shorten(address: string) {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatBalances(balances: BridgeWallet["balances"] | undefined) {
  if (!balances) return "—";
  // Bridge returns an array of { balance, currency } entries.
  const entries = Array.isArray(balances)
    ? balances
        .filter((e) => Number(e?.balance) > 0)
        .map((e) => `${e.balance} ${(e.currency ?? "").toUpperCase()}`)
    : Object.entries(balances)
        .filter(([, v]) => Number(v) > 0)
        .map(([k, v]) => `${v} ${k.toUpperCase()}`);
  if (entries.length === 0) return "0";
  return entries.join(", ");
}

export function AdminWalletsTable() {
  const { data, error, isLoading, mutate } = useSWR<{ data: AdminWallet[] }>(
    "/api/admin/wallets",
    fetcher
  );
  const wallets = data?.data ?? [];
  const ownerCount = new Set(wallets.map((wallet) => wallet.owner.uid)).size;
  const networkCount = new Set(wallets.map((wallet) => wallet.network)).size;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Wallets"
        description="Inspect customer wallet ownership, networks, addresses, and available balances."
      />

      <div
        className="grid gap-4 sm:grid-cols-3"
        role="group"
        aria-label="Wallet summary"
      >
        <StatCard
          label="Wallets"
          value={isLoading || error ? "—" : wallets.length}
          detail="Across all customers"
          icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Wallet owners"
          value={isLoading || error ? "—" : ownerCount}
          detail="Unique customers"
          icon={<Users className="h-5 w-5 text-info" aria-hidden="true" />}
        />
        <StatCard
          label="Networks"
          value={isLoading || error ? "—" : networkCount}
          detail="Active wallet networks"
          icon={<Network className="h-5 w-5 text-primary" aria-hidden="true" />}
        />
      </div>

      <DataView>
        {error ? (
          <DataState
            kind="error"
            title="Wallets could not be loaded"
            description={error.message}
            onRetry={() => mutate()}
          />
        ) : isLoading ? (
          <DataState
            kind="loading"
            title="Loading wallets"
            description="Retrieving wallets and balances across customer accounts."
          />
        ) : wallets.length === 0 ? (
          <DataState
            title="No wallets found"
            description="Customer wallets will appear here after they are created."
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {wallets.map((wallet) => (
                <WalletMobileCard key={wallet.id} wallet={wallet} />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-sm">
                <caption className="sr-only">
                  Customer wallets, networks, addresses, balances, and creation dates
                </caption>
                <thead className="bg-surface-muted">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Owner</th>
                    <th scope="col" className="px-4 py-3 font-medium">Network</th>
                    <th scope="col" className="px-4 py-3 font-medium">Address</th>
                    <th scope="col" className="px-4 py-3 font-medium">Balances</th>
                    <th scope="col" className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {wallets.map((wallet) => (
                    <WalletTableRow key={wallet.id} wallet={wallet} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataView>
    </div>
  );
}

function WalletTableRow({ wallet }: { wallet: AdminWallet }) {
  return (
    <tr className="transition-colors hover:bg-surface-subtle">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">
          {wallet.owner.name || wallet.owner.email.split("@")[0]}
        </p>
        <p className="text-xs text-muted-foreground">{wallet.owner.email}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary">{wallet.network}</Badge>
      </td>
      <td
        className="px-4 py-3 font-mono text-xs text-muted-foreground"
        title={wallet.address}
      >
        {shorten(wallet.address)}
      </td>
      <td className="px-4 py-3 text-xs font-medium text-foreground">
        {formatBalances(wallet.balances)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString() : "—"}
      </td>
    </tr>
  );
}

function WalletMobileCard({ wallet }: { wallet: AdminWallet }) {
  return (
    <article className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium text-foreground">
            {wallet.owner.name || wallet.owner.email.split("@")[0]}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{wallet.owner.email}</p>
        </div>
        <Badge variant="secondary">{wallet.network}</Badge>
      </div>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Address</dt>
          <dd className="mt-1 break-all font-mono text-foreground">{wallet.address}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-muted-foreground">Balances</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatBalances(wallet.balances)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-1 text-foreground">
              {wallet.created_at
                ? new Date(wallet.created_at).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </div>
      </dl>
    </article>
  );
}
