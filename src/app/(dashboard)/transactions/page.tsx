"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useActivity } from "@/hooks/use-bridge";
import { ActivityRow } from "@/components/activity/activity-row";
import type { ActivityItem } from "@/types/bridge";
import { PageHeader } from "@/components/ui/page";
import { DataState, DataView } from "@/components/ui/data-view";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "swap", label: "Swaps" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export default function TransactionsPage() {
  const { activity, isLoading } = useActivity();
  const [filter, setFilter] = useState<FilterId>("all");

  const items = (activity as ActivityItem[]).filter(
    (t) => filter === "all" || t.type === filter
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Transactions"
        description="Review your deposits, withdrawals, and swaps."
      />

      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-muted p-1" role="radiogroup" aria-label="Transaction type">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`h-8 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              filter === f.id
                ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataView>
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
          {isLoading ? (
            <DataState kind="loading" title="Loading transactions" />
          ) : items.length > 0 ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          ) : (
            <DataState
              title={filter === "all" ? "No transactions yet" : `No ${filter}s yet`}
              description={
                filter === "all"
                  ? "No transactions yet. Your activity will appear here."
                  : `Transactions matching this filter will appear here.`
              }
            />
          )}
          </CardContent>
        </Card>
      </DataView>
    </div>
  );
}
