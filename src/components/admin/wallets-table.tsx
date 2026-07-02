"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BridgeWallet } from "@/types/bridge";
import { Wallet, Inbox, Loader2 } from "lucide-react";

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

function formatBalances(balances: Record<string, string> | undefined) {
  if (!balances) return "—";
  const entries = Object.entries(balances).filter(([, v]) => Number(v) > 0);
  if (entries.length === 0) return "0";
  return entries.map(([k, v]) => `${v} ${k.toUpperCase()}`).join(", ");
}

export function AdminWalletsTable() {
  const { data, error, isLoading } = useSWR<{ data: AdminWallet[] }>(
    "/api/admin/wallets",
    fetcher
  );
  const wallets = data?.data ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Wallets</h1>
          <p className="text-white/50 mt-0.5">
            {isLoading ? "Loading…" : `${wallets.length} wallet${wallets.length === 1 ? "" : "s"} across all users`}
          </p>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-red-300">
            {error.message}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : wallets.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-8 h-8 text-white/20" />
            <p className="text-white/50 text-sm">No wallets found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Network</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Balances</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">
                        {w.owner.name || w.owner.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-white/40">{w.owner.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{w.network}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/60">
                      {shorten(w.address)}
                    </td>
                    <td className="px-4 py-3 text-white/70 text-xs">
                      {formatBalances(w.balances)}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                      {w.created_at
                        ? new Date(w.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
