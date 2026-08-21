"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Landmark,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PublicInvoiceCheckout,
  PublicPaymentState,
} from "@/lib/invoicing/payments";

interface CheckoutClientProps {
  token: string;
  initialData: PublicInvoiceCheckout;
}

function money(value: string, currency: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(numeric);
  } catch {
    return `${value} ${currency.toUpperCase()}`;
  }
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadge(status: string) {
  if (status === "paid") return { label: "Paid", variant: "success" as const };
  if (status === "failed") return { label: "Payment failed", variant: "danger" as const };
  if (status === "processing") return { label: "Processing", variant: "warning" as const };
  if (status === "pending") return { label: "Awaiting payment", variant: "warning" as const };
  return { label: titleCase(status), variant: "secondary" as const };
}

async function responseJson(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    data?: PublicPaymentState | null;
    error?: string;
  };
}

export function CheckoutClient({ token, initialData }: CheckoutClientProps) {
  const { invoice, rails } = initialData;
  const [selectedRail, setSelectedRail] = useState(rails[0]?.rail ?? "");
  const [payment, setPayment] = useState(initialData.payment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const badge = statusBadge(payment?.status ?? invoice.paymentStatus);
  const terminal = ["paid", "failed", "refunded"].includes(payment?.status ?? "");

  useEffect(() => {
    if (!payment || terminal) return;
    let stopped = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/public/invoices/${encodeURIComponent(token)}/status`,
          { cache: "no-store" }
        );
        const body = await responseJson(response);
        if (!stopped && response.ok && body.data) setPayment(body.data);
      } catch {
        // A later poll or Bridge webhook will reconcile the durable attempt.
      }
    };

    const timer = window.setInterval(poll, 5000);
    void poll();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [payment, terminal, token]);

  const instructions = useMemo(
    () => Object.entries(payment?.depositInstructions ?? {}),
    [payment?.depositInstructions]
  );

  async function startCheckout() {
    if (!selectedRail || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/public/invoices/${encodeURIComponent(token)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceRail: selectedRail }),
        }
      );
      const body = await responseJson(response);
      if (!response.ok || !body.data) {
        throw new Error(body.error || "Could not create payment instructions.");
      }
      setPayment(body.data);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not create payment instructions."
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyValue(value: string | string[]) {
    await navigator.clipboard.writeText(Array.isArray(value) ? value.join(", ") : value);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <header className="mb-6 rounded-lg border border-border bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:flex sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold" aria-hidden="true">S</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Stablon invoice checkout
              </p>
              <h1 className="mt-0.5 text-base font-semibold sm:text-lg">{invoice.sender.company}</h1>
            </div>
          </div>
          <Badge variant={badge.variant} className="mt-3 w-fit px-3 py-1 sm:mt-0">
            {badge.label}
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-surface-muted">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <CardTitle className="mt-1 text-2xl">{invoice.formattedNumber}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Amount due</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {money(invoice.totals.total, invoice.currency)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Issued</p>
                  <p className="mt-1">{invoice.issueDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due</p>
                  <p className="mt-1">{invoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="mt-1">{invoice.sender.displayName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bill to</p>
                  <p className="mt-1">{invoice.client.company || invoice.client.name}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <div className="grid grid-cols-[1fr_auto] bg-surface-muted px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                {invoice.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-4 border-t border-border px-4 py-4 text-sm"
                  >
                    <div>
                      <p>{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} × {money(item.rate, invoice.currency)}
                      </p>
                    </div>
                    <p className="font-medium tabular-nums">{money(item.amount, invoice.currency)}</p>
                  </div>
                ))}
              </div>

              <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(invoice.totals.subtotal, invoice.currency)}</span>
                </div>
                {Number(invoice.totals.discountAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>−{money(invoice.totals.discountAmount, invoice.currency)}</span>
                  </div>
                )}
                {Number(invoice.totals.taxAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{money(invoice.totals.taxAmount, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{money(invoice.totals.total, invoice.currency)}</span>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 rounded-md border border-border bg-surface-muted p-4 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-foreground">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border bg-surface-muted">
                <CardTitle className="flex items-center gap-2">
                  {payment?.status === "paid" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                  ) : (
                    <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
                  )}
                  Payment details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {payment?.status === "paid" ? (
                  <div className="rounded-md border border-success/25 bg-success-muted p-5 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-success" aria-hidden="true" />
                    <p className="font-semibold text-success">Payment completed</p>
                    <p className="mt-1 text-sm text-success">
                      This invoice is fully paid.
                    </p>
                  </div>
                ) : payment?.status === "refunded" ? (
                  <div className="rounded-md border border-warning/25 bg-warning-muted p-5 text-center">
                    <p className="font-semibold text-warning">Payment returned</p>
                    <p className="mt-1 text-sm text-warning">
                      The payment was returned. Contact the invoice issuer for help.
                    </p>
                  </div>
                ) : payment?.status === "failed" ? (
                  <div className="rounded-md border border-danger/25 bg-danger-muted p-5 text-center">
                    <p className="font-semibold text-danger">Payment attempt failed</p>
                    <p className="mt-1 text-sm text-danger">
                      No payment was completed with these instructions.
                    </p>
                    {initialData.checkoutAvailable && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setPayment(null)}
                      >
                        Try another payment
                      </Button>
                    )}
                  </div>
                ) : payment && instructions.length > 0 ? (
                  <div>
                    <div className="mb-4 flex items-start gap-3 rounded-md border border-warning/25 bg-warning-muted p-3">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                      <p className="text-xs leading-5 text-warning">
                        Send exactly {payment.amount} {payment.sourceCurrency.toUpperCase()} and
                        include every memo or reference shown below.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {instructions.map(([key, value]) => (
                        <div key={key} className="rounded-md border border-border bg-surface-muted p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {titleCase(key)}
                          </p>
                          <div className="mt-1 flex items-start justify-between gap-2">
                            <p className="break-all text-sm">
                              {Array.isArray(value) ? value.join(", ") : value}
                            </p>
                            <button
                              type="button"
                              aria-label={`Copy ${titleCase(key)}`}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                              onClick={() => void copyValue(value)}
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : initialData.checkoutAvailable ? (
                  <div>
                    <p className="mb-4 text-sm leading-6 text-muted-foreground">
                      Review the issuer and amount above, then choose an available payment method.
                    </p>
                    <div className="space-y-2">
                      {rails.map((rail) => (
                        <button
                          key={rail.rail}
                          type="button"
                          onClick={() => setSelectedRail(rail.rail)}
                          aria-pressed={selectedRail === rail.rail}
                          className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                            selectedRail === rail.rail
                              ? "border-primary bg-info-muted"
                              : "border-border bg-surface hover:bg-surface-muted"
                          }`}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-subtle">
                            {rail.kind === "bank" ? (
                              <Landmark className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <WalletCards className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-medium">{rail.label}</span>
                            <span className="block text-xs text-muted-foreground">
                              Pay in {rail.currency.toUpperCase()}
                            </span>
                          </span>
                          <span
                            className={`h-4 w-4 rounded-full border ${
                              selectedRail === rail.rail
                                ? "border-[5px] border-primary"
                                : "border-border-strong"
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>
                    {error && (
                      <p role="alert" className="mt-4 rounded-md border border-danger/25 bg-danger-muted p-3 text-sm text-danger">
                        {error}
                      </p>
                    )}
                    <Button className="mt-5 w-full" onClick={startCheckout} disabled={busy} aria-busy={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      {busy ? "Creating instructions…" : "Generate payment instructions"}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-surface-muted p-4 text-sm text-muted-foreground">
                    {initialData.availabilityMessage || "Online payment is unavailable."}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p>
                Payment instructions are generated for this invoice only. The amount and
                settlement destination cannot be changed. Confirm the invoice issuer before
                sending funds.
              </p>
            </div>

            <div className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Payment processing is provided by Bridge. Bridge may perform verification and
                compliance checks before processing a payment.
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
