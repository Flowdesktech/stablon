"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useActivity } from "@/hooks/use-bridge";
import { ActivityRow } from "@/components/activity/activity-row";
import type { ActivityItem } from "@/types/bridge";
import { Inbox } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-white/50 mt-1">Your deposits, withdrawals, and swaps</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              filter === f.id
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                : "bg-white/[0.03] text-white/50 border border-white/5 hover:bg-white/[0.06]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-12" />)}
            </div>
          ) : items.length > 0 ? (
            <div className="divide-y divide-white/5">
              {items.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center gap-3 text-center">
              <Inbox className="w-8 h-8 text-white/20" />
              <p className="text-sm text-white/40">
                {filter === "all"
                  ? "No transactions yet. Your activity will appear here."
                  : `No ${filter}s yet.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
