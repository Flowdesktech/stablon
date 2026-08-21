"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Mail,
  MoreHorizontal,
  Ban,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  ConfirmationDialog,
  ErrorState,
  InvoiceStatusBadge,
  LoadingState,
  SubmitButton,
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
  const pdfPreviewUrl = `/api/invoicing/invoices/${encodeURIComponent(
    invoice.id
  )}/pdf?disposition=inline&v=${encodeURIComponent(
    invoice.updatedAt
  )}#toolbar=0&navpanes=0&view=FitH`;

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
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {invoice.status === "draft" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={duplicateInvoice}
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <SubmitButton
            type="button"
            variant="outline"
            size="sm"
            pending={action === "download"}
            onClick={() => void downloadPdf()}
          >
            <Download className="h-4 w-4" /> Download PDF
          </SubmitButton>
          {(invoice.status === "draft" || canSend) && (
            <span
              className="mx-0.5 hidden h-6 w-px bg-border sm:block"
              aria-hidden="true"
            />
          )}
          {invoice.status === "draft" && (
            <SubmitButton
              variant="outline"
              size="sm"
              pending={action === "publish"}
              onClick={() => runAction("publish")}
            >
              <Globe2 className="h-4 w-4" /> Publish
            </SubmitButton>
          )}
          {canSend && (
            <SubmitButton
              size="sm"
              pending={action === "send"}
              onClick={() => setSendOpen(true)}
            >
              <Mail className="h-4 w-4" /> Send invoice
            </SubmitButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(action)}
                aria-label="More invoice actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canVoid ? (
                <>
                  <DropdownMenuItem onSelect={() => setVoidOpen(true)}>
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Void invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                variant="danger"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info-muted text-info">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Invoice preview</p>
              <p className="text-xs text-muted-foreground">
                Exact PDF generated from the selected invoice template.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={pdfPreviewUrl} target="_blank" rel="noreferrer">
              Open PDF
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
        <CardContent className="bg-surface-muted p-2 sm:p-4">
          <div className="mx-auto max-w-[64rem] overflow-hidden rounded-md border border-border bg-white shadow-[var(--shadow-sm)]">
            <iframe
              key={pdfPreviewUrl}
              src={pdfPreviewUrl}
              title={`PDF preview of invoice ${invoice.formattedNumber}`}
              className="h-[75vh] min-h-[42rem] w-full bg-white"
            />
          </div>
          <p className="px-2 pb-1 pt-3 text-center text-xs text-muted-foreground">
            If your browser cannot display PDFs, use Open PDF or Download PDF.
          </p>
        </CardContent>
      </Card>
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
