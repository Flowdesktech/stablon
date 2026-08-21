"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { formatAmount, statusVariant, statusLabel } from "@/lib/activity-format";
import type { ActivityItem } from "@/types/bridge";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Clock,
  ChevronRight,
} from "lucide-react";

export function ActivityRow({ item }: { item: ActivityItem }) {
  const amt = item.amount ? parseFloat(item.amount) : 0;
  const isIncoming = item.type === "deposit";

  return (
    <Link
      href={`/transactions/${encodeURIComponent(item.id)}`}
      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:px-5"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle">
          {item.type === "deposit" && <ArrowDownToLine className="h-4 w-4 text-success" />}
          {item.type === "withdrawal" && <ArrowUpFromLine className="h-4 w-4 text-info" />}
          {item.type === "swap" && <ArrowLeftRight className="h-4 w-4 text-primary" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDate(item.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-medium ${isIncoming ? "text-success" : "text-foreground"}`}>
            {isIncoming ? "+" : "-"}
            {formatAmount(amt, item.currency)}
          </p>
          <Badge variant={statusVariant(item.status)} className="mt-1">
            {statusLabel(item.status)}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
