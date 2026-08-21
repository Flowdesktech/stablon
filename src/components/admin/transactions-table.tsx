"use client";

import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Loader2,
  ReceiptText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataState, DataToolbar, DataView } from "@/components/ui/data-view";
import { Input } from "@/components/ui/input";
import { PageHeader, StatCard } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
    return <ArrowDownToLine className="h-4 w-4 text-success" aria-hidden="true" />;
  }
  if (type === "withdrawal") {
    return <ArrowUpFromLine className="h-4 w-4 text-primary" aria-hidden="true" />;
  }
  return <ArrowLeftRight className="h-4 w-4 text-info" aria-hidden="true" />;
}

function ownerLabel(owner: TransactionOwner): string {
  return owner.name || owner.email.split("@")[0] || "Unknown customer";
}

export function AdminTransactionsTable() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const { data, error, size, setSize, isValidating, mutate } =
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
  const transactionCounts = {
    deposit: transactions.filter((transaction) => transaction.type === "deposit").length,
    withdrawal: transactions.filter((transaction) => transaction.type === "withdrawal").length,
    swap: transactions.filter((transaction) => transaction.type === "swap").length,
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Transactions"
        description="Monitor deposits, withdrawals, and swaps across every customer account."
      />

      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        role="group"
        aria-label="Transaction summary"
      >
        <StatCard
          label="Transactions loaded"
          value={isLoading || error ? "—" : transactions.length}
          detail={
            error
              ? "Summary unavailable"
              : hasMore
                ? "More history available"
                : "Current available history"
          }
          icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Deposits"
          value={isLoading || error ? "—" : transactionCounts.deposit}
          detail="Incoming transfers"
          icon={<ArrowDownToLine className="h-5 w-5 text-success" aria-hidden="true" />}
        />
        <StatCard
          label="Withdrawals"
          value={isLoading || error ? "—" : transactionCounts.withdrawal}
          detail="Outgoing transfers"
          icon={<ArrowUpFromLine className="h-5 w-5 text-primary" aria-hidden="true" />}
        />
        <StatCard
          label="Swaps"
          value={isLoading || error ? "—" : transactionCounts.swap}
          detail="Currency conversions"
          icon={<ArrowLeftRight className="h-5 w-5 text-info" aria-hidden="true" />}
        />
      </div>

      <DataView>
        <DataToolbar>
          <SegmentedControl
            value={filter}
            onChange={(value) => setFilter(value as FilterId)}
            options={FILTERS.map((item) => ({ value: item.id, label: item.label }))}
            label="Filter transactions by type"
            className="max-w-full overflow-x-auto"
          />

          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search transactions</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user or transaction…"
              className="pl-9"
            />
          </label>
        </DataToolbar>

        {error ? (
          <DataState
            kind="error"
            title="Transactions could not be loaded"
            description={error.message}
            onRetry={() => mutate()}
          />
        ) : isLoading ? (
          <DataState
            kind="loading"
            title="Loading transactions"
            description="Retrieving activity across customer accounts."
          />
        ) : visibleTransactions.length === 0 ? (
          <DataState
            title={transactions.length === 0 ? "No transactions found" : "No matching transactions"}
            description={
              transactions.length === 0
                ? "Customer activity will appear here when transactions are created."
                : "Try changing the transaction type or search query."
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {visibleTransactions.map((transaction) => (
                <TransactionMobileCard
                  key={`${transaction.owner.customerId}-${transaction.kind}-${transaction.id}`}
                  transaction={transaction}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-sm">
                <caption className="sr-only">
                  Transactions across all customer accounts
                </caption>
                <thead className="bg-surface-muted">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">User</th>
                    <th scope="col" className="px-4 py-3 font-medium">Transaction</th>
                    <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTransactions.map((transaction) => (
                    <TransactionTableRow
                      key={`${transaction.owner.customerId}-${transaction.kind}-${transaction.id}`}
                      transaction={transaction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataView>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={isLoadingMore}
            onClick={() => setSize(size + 1)}
          >
            {isLoadingMore && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Load older transactions
          </Button>
        </div>
      )}
    </div>
  );
}

function transactionAmount(transaction: AdminActivityItem) {
  const amount = Number.parseFloat(transaction.amount || "0");
  return formatAmount(
    Number.isFinite(amount) ? amount : 0,
    transaction.currency
  );
}

function TransactionTableRow({ transaction }: { transaction: AdminActivityItem }) {
  const incoming = transaction.type === "deposit";
  return (
    <tr className="transition-colors hover:bg-surface-subtle">
      <td className="min-w-52 px-4 py-3">
        <p className="font-medium text-foreground">{ownerLabel(transaction.owner)}</p>
        <p className="text-xs text-muted-foreground">
          {transaction.owner.email || transaction.owner.customerId}
        </p>
      </td>
      <td className="min-w-56 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-subtle">
            <TransactionIcon type={transaction.type} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {transaction.description}
            </p>
            <p className="max-w-52 truncate font-mono text-xs text-muted-foreground">
              {transaction.reference || transaction.id}
            </p>
          </div>
        </div>
      </td>
      <td
        className={`whitespace-nowrap px-4 py-3 font-medium tabular-nums ${
          incoming ? "text-success" : "text-foreground"
        }`}
      >
        {incoming ? "+" : "-"}
        {transactionAmount(transaction)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusVariant(transaction.status)}>
          {statusLabel(transaction.status)}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {formatDate(transaction.created_at)}
      </td>
    </tr>
  );
}

function TransactionMobileCard({ transaction }: { transaction: AdminActivityItem }) {
  const incoming = transaction.type === "deposit";
  return (
    <article className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle">
          <TransactionIcon type={transaction.type} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium text-foreground">
            {transaction.description}
          </h2>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {transaction.reference || transaction.id}
          </p>
        </div>
        <p
          className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
            incoming ? "text-success" : "text-foreground"
          }`}
        >
          {incoming ? "+" : "-"}
          {transactionAmount(transaction)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {ownerLabel(transaction.owner)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {transaction.owner.email || transaction.owner.customerId}
          </p>
        </div>
        <Badge variant={statusVariant(transaction.status)}>
          {statusLabel(transaction.status)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(transaction.created_at)}
      </p>
    </article>
  );
}
