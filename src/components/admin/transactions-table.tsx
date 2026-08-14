"use client";

import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Inbox,
  Loader2,
  ReceiptText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAmount, statusLabel, statusVariant } from "@/lib/activity-format";
import { formatDate } from "@/lib/utils";
import type { ActivityItem } from "@/types/bridge";

interface TransactionOwner {
  uid: string | null;
  email: string;
  name: string | null;
  customerId: string;
}

interface AdminActivityItem extends ActivityItem {
  owner: TransactionOwner;
}

interface AdminTransactionsResponse {
  data: AdminActivityItem[];
  nextCursor: string | null;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "swap", label: "Swaps" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

async function fetcher(url: string): Promise<AdminTransactionsResponse> {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return body as AdminTransactionsResponse;
}

function TransactionIcon({ type }: { type: ActivityItem["type"] }) {
  if (type === "deposit") {
    return <ArrowDownToLine className="w-4 h-4 text-emerald-400" />;
  }
  if (type === "withdrawal") {
    return <ArrowUpFromLine className="w-4 h-4 text-blue-400" />;
  }
  return <ArrowLeftRight className="w-4 h-4 text-purple-400" />;
}

function ownerLabel(owner: TransactionOwner): string {
  return owner.name || owner.email.split("@")[0] || "Unknown customer";
}

export function AdminTransactionsTable() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const { data, error, size, setSize, isValidating } =
    useSWRInfinite<AdminTransactionsResponse>(
      (pageIndex, previousPage) => {
        if (previousPage && !previousPage.nextCursor) return null;
        if (pageIndex === 0) return "/api/admin/transactions";
        return `/api/admin/transactions?cursor=${encodeURIComponent(
          previousPage?.nextCursor || ""
        )}`;
      },
      fetcher,
      { revalidateFirstPage: false }
    );

  const transactions = useMemo(() => {
    // A virtual-account deposit can straddle two Bridge event pages. Preserve
    // the first (newest/most advanced) normalized item for each owner + id.
    const unique = new Map<string, AdminActivityItem>();
    for (const page of data ?? []) {
      for (const transaction of page.data) {
        const key = `${transaction.owner.customerId}:${transaction.kind}:${transaction.id}`;
        if (!unique.has(key)) unique.set(key, transaction);
      }
    }
    return [...unique.values()].sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
    );
  }, [data]);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (filter !== "all" && transaction.type !== filter) return false;
      if (!query) return true;

      const searchable = [
        transaction.description,
        transaction.reference,
        transaction.id,
        transaction.currency,
        transaction.owner.name,
        transaction.owner.email,
        transaction.owner.customerId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [filter, search, transactions]);

  const isLoading = !data && !error;
  const isLoadingMore = isValidating && Boolean(data) && size > 0;
  const hasMore = Boolean(data?.at(-1)?.nextCursor);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <ReceiptText className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-white/50 mt-0.5">
            {isLoading
              ? "Loading…"
              : `${transactions.length} transaction${
                  transactions.length === 1 ? "" : "s"
                } loaded across all users`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                filter === item.id
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                  : "bg-white/[0.03] text-white/50 border border-white/5 hover:bg-white/[0.06]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user or transaction…"
            className="pl-9"
          />
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
      ) : visibleTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-8 h-8 text-white/20" />
            <p className="text-white/50 text-sm">
              {transactions.length === 0
                ? "No transactions found across your users."
                : "No transactions match these filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => {
                  const amount = Number.parseFloat(transaction.amount || "0");
                  const incoming = transaction.type === "deposit";
                  return (
                    <tr
                      key={`${transaction.owner.customerId}-${transaction.kind}-${transaction.id}`}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 min-w-52">
                        <p className="text-white font-medium">
                          {ownerLabel(transaction.owner)}
                        </p>
                        <p className="text-xs text-white/40">
                          {transaction.owner.email || transaction.owner.customerId}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-56">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <TransactionIcon type={transaction.type} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-white/40 font-mono truncate max-w-52">
                              {transaction.reference || transaction.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap font-medium ${
                          incoming ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {incoming ? "+" : "-"}
                        {formatAmount(
                          Number.isFinite(amount) ? amount : 0,
                          transaction.currency
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(transaction.status)}>
                          {statusLabel(transaction.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">
                        {formatDate(transaction.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isLoadingMore}
            onClick={() => setSize(size + 1)}
          >
            {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            Load older transactions
          </Button>
        </div>
      )}
    </div>
  );
}
