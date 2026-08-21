"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataState, DataView } from "@/components/ui/data-view";
import { useActivity } from "@/hooks/use-bridge";
import { formatDate } from "@/lib/utils";
import {
  formatAmount,
  statusVariant,
  statusLabel,
  explorerTxUrl,
} from "@/lib/activity-format";
import type { ActivityItem } from "@/types/bridge";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

function Row({
  label,
  value,
  mono,
  copy,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
  href?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <p className="shrink-0 text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 break-all text-right text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${mono ? "font-mono" : ""}`}
          >
            {value}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className={`break-all text-right text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
        )}
        {copy && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            type="button"
            aria-label={`Copy ${label.toLowerCase()}`}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      <DataView>
        <div className="px-5 py-1">{children}</div>
      </DataView>
    </div>
  );
}

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { activity, isLoading } = useActivity();

  const item = (activity as ActivityItem[]).find((t) => t.id === id);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-32" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <ArrowLeft className="w-4 h-4" /> Back to transactions
        </Link>
        <DataView>
          <DataState title="Transaction not found" description="The transaction may no longer be available." />
        </DataView>
      </div>
    );
  }

  const amt = item.amount ? parseFloat(item.amount) : 0;
  const isIncoming = item.type === "deposit";
  const txUrl = explorerTxUrl(item.destinationNetwork, item.txHash);

  const hasAmounts =
    item.subtotal || item.exchangeFee || item.gasFee || item.netAmount;
  const hasSource = item.paymentRail || item.senderName;
  const hasDestination =
    item.destinationNetwork || item.destinationCurrency || item.destinationAddress || item.txHash;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-subtle">
                {item.type === "deposit" && <ArrowDownToLine className="h-5 w-5 text-success" />}
                {item.type === "withdrawal" && <ArrowUpFromLine className="h-5 w-5 text-info" />}
                {item.type === "swap" && <ArrowLeftRight className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
              </div>
            </div>
            <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
          <div className="pt-4">
            <p className={`text-3xl font-semibold tracking-tight ${isIncoming ? "text-success" : "text-foreground"}`}>
              {isIncoming ? "+" : "-"}
              {formatAmount(amt, item.currency)}
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Overview */}
      <Section title="Overview">
        <Row label="Type" value={item.type.charAt(0).toUpperCase() + item.type.slice(1)} />
        <Row label="Status" value={statusLabel(item.status)} />
        <Row label="Reference" value={item.reference ?? item.id} mono copy />
        <Row label="Created" value={formatDate(item.created_at)} />
        {item.updated_at && item.updated_at !== item.created_at && (
          <Row label="Updated" value={formatDate(item.updated_at)} />
        )}
      </Section>

      {/* Amount breakdown */}
      {hasAmounts && (
        <Section title="Amount">
          <Row label="Amount" value={formatAmount(amt, item.currency)} />
          {item.subtotal && <Row label="Subtotal" value={formatAmount(parseFloat(item.subtotal), item.currency)} />}
          {item.exchangeFee && item.exchangeFee !== "0.0" && <Row label="Exchange fee" value={formatAmount(parseFloat(item.exchangeFee), item.destinationCurrency ?? item.currency)} />}
          {item.gasFee && item.gasFee !== "0.0" && <Row label="Gas fee" value={formatAmount(parseFloat(item.gasFee), item.destinationCurrency ?? item.currency)} />}
          {item.netAmount && (
            <Row label="Net delivered" value={formatAmount(parseFloat(item.netAmount), item.destinationCurrency ?? item.currency)} />
          )}
        </Section>
      )}

      {/* Source */}
      {hasSource && (
        <Section title="Source">
          {item.paymentRail && <Row label="Payment rail" value={item.paymentRail} />}
          <Row label="Currency" value={item.currency.toUpperCase()} />
          {item.senderName && <Row label="Sender" value={item.senderName} />}
        </Section>
      )}

      {/* Destination */}
      {hasDestination && (
        <Section title="Destination">
          {item.destinationNetwork && <Row label="Blockchain" value={item.destinationNetwork} />}
          {item.destinationCurrency && <Row label="Currency" value={item.destinationCurrency.toUpperCase()} />}
          {item.destinationAddress && <Row label="Wallet address" value={item.destinationAddress} mono copy />}
          {item.txHash && <Row label="Transaction hash" value={item.txHash} mono copy href={txUrl} />}
        </Section>
      )}
    </div>
  );
}
