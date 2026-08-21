"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Mail,
  Send,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  ConfirmationDialog,
  ErrorState,
  InvoiceStatusBadge,
  LoadingState,
  SubmitButton,
  formatInvoiceMoney,
  invoiceDeletionCopy,
} from "@/components/invoicing/invoice-ui";
import { invoicingRequest, useInvoicingData } from "@/components/invoicing/api";
import {
  duplicateInvoiceFormDraft,
  invoiceDraftStorageKey,
} from "@/lib/invoicing/draft-cache";
import type { Invoice } from "@/types/invoicing";

type PublishResult = {
  data?: Invoice;
  publicUrl?: string;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const { data: invoice, error, isLoading, mutate } = useInvoicingData<Invoice>(
    `/api/invoicing/invoices/${encodeURIComponent(id)}`,
    ["invoice"]
  );
  const [action, setAction] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  async function publish(): Promise<PublishResult> {
    const response = await fetch(
      `/api/invoicing/invoices/${encodeURIComponent(id)}/publish`,
      { method: "POST" }
    );
    const body = (await response.json().catch(() => ({}))) as PublishResult & {
      error?: string;
    };
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  async function runAction(name: "publish" | "send" | "void") {
    setAction(name);
    try {
      if (name === "void") {
        await invoicingRequest<Invoice>(
          `/api/invoicing/invoices/${encodeURIComponent(id)}`,
          { method: "PATCH", body: JSON.stringify({ action: "void" }) }
        );
      } else if (name === "send") {
        const result = await invoicingRequest<{
          sent: boolean;
          messageId: string;
          paymentUrl: string;
        }>(
          `/api/invoicing/invoices/${encodeURIComponent(id)}/send`,
          { method: "POST" }
        );
        setPublicUrl(result.paymentUrl);
      } else {
        const result = await publish();
        const nextUrl = result.publicUrl || "";
        setPublicUrl(nextUrl);
      }
      await mutate();
      if (name === "void") setVoidOpen(false);
      if (name === "send") setSendOpen(false);
      toast({
        variant: "success",
        title:
          name === "publish"
            ? "Invoice published"
            : name === "send"
              ? "Invoice emailed"
              : "Invoice voided",
      });
    } catch (actionError) {
      toast({
        variant: "error",
        title: `Couldn't ${name} invoice`,
        description: actionError instanceof Error ? actionError.message : "Please try again.",
      });
    } finally {
      setAction(null);
    }
  }

  async function deleteInvoice() {
    if (!invoice) return;
    setAction("delete");
    try {
      await invoicingRequest(`/api/invoicing/invoices/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      toast({ variant: "success", title: "Invoice deleted" });
      router.push("/invoices");
      router.refresh();
    } catch (deleteError) {
      toast({
        variant: "error",
        title: "Invoice not deleted",
        description: deleteError instanceof Error ? deleteError.message : "Please try again.",
      });
      setAction(null);
    }
  }

  function duplicateInvoice() {
    if (!invoice) return;
    try {
      const storageId = `duplicate:${invoice.id}`;
      window.localStorage.setItem(
        invoiceDraftStorageKey(invoice.ownerUid, storageId),
        JSON.stringify(duplicateInvoiceFormDraft(invoice))
      );
      toast({
        variant: "info",
        title: "Invoice copied",
        description: "Review the duplicated details before saving the new invoice.",
      });
      router.push(`/invoices/create?duplicate=${encodeURIComponent(invoice.id)}`);
    } catch (duplicateError) {
      toast({
        variant: "error",
        title: "Invoice not duplicated",
        description:
          duplicateError instanceof Error ? duplicateError.message : "Please try again.",
      });
    }
  }

  async function downloadPdf() {
    if (!invoice) return;
    setAction("download");
    try {
      const response = await fetch(
        `/api/invoicing/invoices/${encodeURIComponent(id)}/pdf`
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `PDF download failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.formattedNumber.replace(/[^A-Za-z0-9_-]+/g, "-") || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      toast({
        variant: "error",
        title: "Invoice PDF not downloaded",
        description:
          downloadError instanceof Error ? downloadError.message : "Please try again.",
      });
    } finally {
      setAction(null);
    }
  }

  if (isLoading) return <LoadingState rows={6} />;
  if (error || !invoice) {
    return <ErrorState message={error?.message || "Invoice not found."} onRetry={() => mutate()} />;
  }

  const canSend = ["draft", "sent", "viewed", "payment_pending", "payment_failed"].includes(
    invoice.status
  );
  const canVoid = !["draft", "paid", "void", "refunded"].includes(invoice.status);
  const deleteCopy = invoiceDeletionCopy(invoice);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{invoice.formattedNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            For {invoice.clientSnapshot.name} · Due{" "}
            {new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/invoices/${invoice.id}/edit`}><Edit3 className="h-4 w-4" /> Edit</Link>
              </Button>
              <SubmitButton pending={action === "publish"} onClick={() => runAction("publish")}>
                <Send className="h-4 w-4" /> Publish
              </SubmitButton>
            </>
          )}
          <Button
            variant="destructive"
            size="icon"
            disabled={action === "delete"}
            onClick={() => setDeleteOpen(true)}
            aria-label={`Delete ${invoice.status.replaceAll("_", " ")} invoice`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {canSend && (
            <SubmitButton pending={action === "send"} onClick={() => setSendOpen(true)}>
              <Mail className="h-4 w-4" /> Send invoice
            </SubmitButton>
          )}
          <Button
            variant="outline"
            onClick={duplicateInvoice}
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <SubmitButton
            type="button"
            variant="outline"
            pending={action === "download"}
            onClick={() => void downloadPdf()}
          >
            <Download className="h-4 w-4" /> Download PDF
          </SubmitButton>
          {canVoid && (
            <SubmitButton
              pending={action === "void"}
              variant="outline"
              onClick={() => setVoidOpen(true)}
            >
              Void
            </SubmitButton>
          )}
        </div>
      </div>

      {publicUrl && (
        <Card className="border-success/25 bg-success-muted">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-all text-sm text-foreground">{publicUrl}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast({ variant: "success", title: "Public link copied" });
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                Open <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden border-t-4 border-t-primary">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row">
              <div>
                <p className="text-xl font-semibold text-foreground">{invoice.senderSnapshot.company}</p>
                <p className="mt-1 text-sm text-muted-foreground">{invoice.senderSnapshot.displayName}</p>
                <p className="text-sm text-muted-foreground">{invoice.senderSnapshot.email}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-semibold text-foreground">INVOICE</p>
                <p className="mt-1 text-sm text-muted-foreground">{invoice.formattedNumber}</p>
              </div>
            </div>

            <div className="grid gap-5 border-y border-border py-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill to</p>
                <p className="mt-1 font-medium text-foreground">{invoice.clientSnapshot.name}</p>
                <p className="text-sm text-muted-foreground">{invoice.clientSnapshot.company}</p>
                <p className="text-sm text-muted-foreground">{invoice.clientSnapshot.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="mt-1 text-sm text-foreground">{invoice.issueDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Due</p>
                <p className="mt-1 text-sm text-foreground">{invoice.dueDate}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left">
                <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 text-right font-medium">Qty</th>
                    <th className="pb-3 text-right font-medium">Rate</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-sm text-foreground">{item.description}</td>
                      <td className="py-3 text-right text-sm text-muted-foreground">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        {formatInvoiceMoney(item.rate, invoice.currency)}
                      </td>
                      <td className="py-3 text-right text-sm font-medium tabular-nums text-foreground">
                        {formatInvoiceMoney(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(invoice.notes || invoice.paymentTerms) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {invoice.notes && (
                  <div><p className="text-xs text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{invoice.notes}</p></div>
                )}
                {invoice.paymentTerms && (
                  <div><p className="text-xs text-muted-foreground">Payment terms</p><p className="mt-1 text-sm text-foreground">{invoice.paymentTerms}</p></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatInvoiceMoney(invoice.totals.subtotal, invoice.currency)}</span></div>
              {Number(invoice.totals.discountAmount) > 0 && (
                <div className="flex justify-between text-success"><span>Discount</span><span>-{formatInvoiceMoney(invoice.totals.discountAmount, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatInvoiceMoney(invoice.totals.taxAmount, invoice.currency)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold tabular-nums text-foreground"><span>Total</span><span>{formatInvoiceMoney(invoice.totals.total, invoice.currency)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Views: <span className="text-foreground">{invoice.viewCount}</span></p>
              <p>Times sent: <span className="text-foreground">{invoice.sentCount}</span></p>
              {invoice.lastViewedAt && <p>Last viewed: <span className="text-foreground">{new Date(invoice.lastViewedAt).toLocaleString()}</span></p>}
              {invoice.lastSentAt && <p>Last sent: <span className="text-foreground">{new Date(invoice.lastSentAt).toLocaleString()}</span></p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfirmationDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="Send this invoice?"
        description={`A PDF copy and payment link will be emailed to ${invoice.clientSnapshot.email}.`}
        confirmLabel="Send email"
        pending={action === "send"}
        onConfirm={() => void runAction("send")}
      />
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteCopy.title}
        description={deleteCopy.description}
        confirmLabel="Delete invoice"
        pending={action === "delete"}
        destructive
        onConfirm={() => void deleteInvoice()}
      />
      <ConfirmationDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void this invoice?"
        description="The invoice will remain in your records but can no longer be paid."
        confirmLabel="Void invoice"
        pending={action === "void"}
        destructive
        onConfirm={() => void runAction("void")}
      />
    </div>
  );
}
