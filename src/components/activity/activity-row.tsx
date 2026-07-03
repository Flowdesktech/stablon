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
      className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          {item.type === "deposit" && <ArrowDownToLine className="w-4 h-4 text-emerald-400" />}
          {item.type === "withdrawal" && <ArrowUpFromLine className="w-4 h-4 text-blue-400" />}
          {item.type === "swap" && <ArrowLeftRight className="w-4 h-4 text-purple-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.description}</p>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock className="w-3 h-3" />
            {formatDate(item.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={`text-sm font-medium ${isIncoming ? "text-emerald-400" : "text-white"}`}>
            {isIncoming ? "+" : "-"}
            {formatAmount(amt, item.currency)}
          </p>
          <Badge variant={statusVariant(item.status)} className="mt-1">
            {statusLabel(item.status)}
          </Badge>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </Link>
  );
}
