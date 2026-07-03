"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Inbox,
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
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <p className="text-sm text-white/40 shrink-0">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm text-purple-300 hover:text-purple-200 text-right break-all inline-flex items-center gap-1 ${mono ? "font-mono" : ""}`}
          >
            {value}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <p className={`text-sm text-white text-right break-all ${mono ? "font-mono" : ""}`}>{value}</p>
        )}
        {copy && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white/60 mb-1">{title}</h2>
      <Card>
        <CardContent className="py-1">{children}</CardContent>
      </Card>
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
        <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to transactions
        </Link>
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/40">Transaction not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amt = item.amount ? parseFloat(item.amount) : 0;
  const isIncoming = item.type === "deposit";
  const txUrl = explorerTxUrl(item.destinationNetwork, item.txHash);

  const hasAmounts =
    item.subtotal || item.developerFee || item.exchangeFee || item.gasFee || item.netAmount;
  const hasSource = item.paymentRail || item.senderName;
  const hasDestination =
    item.destinationNetwork || item.destinationCurrency || item.destinationAddress || item.txHash;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to transactions
      </Link>

      {/* Summary */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                {item.type === "deposit" && <ArrowDownToLine className="w-5 h-5 text-emerald-400" />}
                {item.type === "withdrawal" && <ArrowUpFromLine className="w-5 h-5 text-blue-400" />}
                {item.type === "swap" && <ArrowLeftRight className="w-5 h-5 text-purple-400" />}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{item.description}</p>
                <p className="text-xs text-white/40">{formatDate(item.created_at)}</p>
              </div>
            </div>
            <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
          <div className="pt-4">
            <p className={`text-3xl font-bold ${isIncoming ? "text-emerald-400" : "text-white"}`}>
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
          {item.developerFee && <Row label="Developer fee" value={formatAmount(parseFloat(item.developerFee), item.destinationCurrency ?? item.currency)} />}
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
