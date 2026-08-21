"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Download,
  Edit3,
  FilePlus2,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState, DataToolbar, DataView } from "@/components/ui/data-view";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/page";
import { toast } from "@/components/ui/toast";
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  InvoiceStatusBadge,
  LoadingState,
  PageHeading,
  formatInvoiceMoney,
  invoiceDeletionCopy,
} from "@/components/invoicing/invoice-ui";
import { Select } from "@/components/ui/field";
import { invoicingRequest, useInvoicingData } from "@/components/invoicing/api";
import {
  duplicateInvoiceFormDraft,
  invoiceDraftStorageKey,
  invoiceNumberForList,
} from "@/lib/invoicing/draft-cache";
import type { Invoice, InvoiceProfile, InvoiceStatus } from "@/types/invoicing";

type Filter = "all" | InvoiceStatus;

function displayedInvoiceNumber(
  invoice: Invoice,
  profilePrefixes: ReadonlyMap<string, string>
) {
  const prefix = profilePrefixes.get(invoice.profileId);
  return prefix
    ? invoiceNumberForList(invoice.formattedNumber, prefix)
    : invoice.formattedNumber;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { data: invoices, error, isLoading, mutate } = useInvoicingData<Invoice[]>(
    "/api/invoicing/invoices",
    ["invoices"]
  );
  const {
    data: profiles,
    error: profilesError,
    isLoading: profilesLoading,
    mutate: mutateProfiles,
  } = useInvoicingData<InvoiceProfile[]>("/api/invoicing/profiles", ["profiles"]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const profilePrefixes = useMemo(
    () =>
      new Map(
        (profiles || []).map((profile) => [profile.id, profile.settings.prefix])
      ),
    [profiles]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (invoices || []).filter((invoice) => {
      const matchesStatus = filter === "all" || invoice.status === filter;
      const matchesQuery =
        !needle ||
        invoice.formattedNumber.toLowerCase().includes(needle) ||
        displayedInvoiceNumber(invoice, profilePrefixes)
          .toLowerCase()
          .includes(needle) ||
        invoice.clientSnapshot.name.toLowerCase().includes(needle) ||
        invoice.clientSnapshot.company?.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [filter, invoices, profilePrefixes, query]);

  const outstanding = (invoices || []).filter(
    (invoice) => !["draft", "paid", "void", "refunded"].includes(invoice.status)
  );
  const paid = (invoices || []).filter((invoice) => invoice.paymentStatus === "paid");
  const deleteCopy = invoiceDeletionCopy(deleteTarget);

  async function deleteInvoiceRecord(invoice: Invoice) {
    setDeleting(invoice.id);
    try {
      await invoicingRequest(`/api/invoicing/invoices/${invoice.id}`, { method: "DELETE" });
      await mutate();
      setDeleteTarget(null);
      toast({ variant: "success", title: "Invoice deleted" });
    } catch (deleteError) {
      toast({
        variant: "error",
        title: "Invoice not deleted",
        description: deleteError instanceof Error ? deleteError.message : "Please try again.",
      });
    } finally {
      setDeleting(null);
    }
  }

  async function downloadPdf(invoice: Invoice) {
    setDownloading(invoice.id);
    try {
      const response = await fetch(
        `/api/invoicing/invoices/${encodeURIComponent(invoice.id)}/pdf`
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `PDF download failed (${response.status})`);
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${
        invoice.formattedNumber.replace(/[^A-Za-z0-9_-]+/g, "-") || "invoice"
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      toast({
        variant: "error",
        title: "Invoice PDF not downloaded",
        description:
          downloadError instanceof Error ? downloadError.message : "Please try again.",
      });
    } finally {
      setDownloading(null);
    }
  }

  function duplicateInvoice(invoice: Invoice) {
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
        description: duplicateError instanceof Error ? duplicateError.message : "Please try again.",
      });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Invoices"
        description="Create, send, and track client invoices."
        action={
          <Button asChild>
            <Link href="/invoices/create"><FilePlus2 className="h-4 w-4" /> New invoice</Link>
          </Button>
        }
      />

      {!isLoading && !profilesLoading && !error && !profilesError && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total invoices" value={invoices?.length || 0} />
          <StatCard label="Outstanding" value={outstanding.length} />
          <StatCard label="Paid" value={paid.length} />
        </div>
      )}

      {isLoading || profilesLoading ? (
        <LoadingState rows={5} />
      ) : error || profilesError ? (
        <ErrorState
          message={(error || profilesError)?.message}
          onRetry={() => {
            void mutate();
            void mutateProfiles();
          }}
        />
      ) : !invoices?.length ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first professional invoice and save it as a draft."
          href="/invoices/create"
          actionLabel="Create invoice"
        />
      ) : !filtered.length ? (
        <DataView>
          <DataToolbar>
            <InvoiceFilters query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
          </DataToolbar>
          <DataState title="No matching invoices" description="Try a different search term or status filter." />
        </DataView>
      ) : (
        <DataView>
          <DataToolbar>
            <InvoiceFilters query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
          </DataToolbar>
          <div className="divide-y divide-border">
            {filtered.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-4 p-4 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-center"
              >
                <Link href={`/invoices/${invoice.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {displayedInvoiceNumber(invoice, profilePrefixes)}
                    </p>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {invoice.clientSnapshot.name}
                    {invoice.clientSnapshot.company ? ` · ${invoice.clientSnapshot.company}` : ""}
                    {" · "}Due {new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <p className="mr-2 font-semibold tabular-nums text-foreground">
                    {formatInvoiceMoney(invoice.totals.total, invoice.currency)}
                  </p>
                  {invoice.status === "draft" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/invoices/${invoice.id}/edit`}
                        aria-label={`Edit ${invoice.formattedNumber}`}
                      >
                        <Edit3 className="h-4 w-4" /> Edit
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      title="Published invoices cannot be edited. Duplicate it to create a revised draft."
                      aria-label={`Edit ${invoice.formattedNumber} unavailable after publishing`}
                    >
                      <Edit3 className="h-4 w-4" /> Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(downloading)}
                    onClick={() => void downloadPdf(invoice)}
                    aria-label={`Download ${invoice.formattedNumber} PDF`}
                  >
                    <Download className="h-4 w-4" />
                    {downloading === invoice.id ? "Downloading…" : "PDF"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateInvoice(invoice)}
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleting === invoice.id}
                    onClick={() => setDeleteTarget(invoice)}
                    title={`Delete ${invoice.status.replaceAll("_", " ")} invoice`}
                    aria-label={`Delete ${invoice.formattedNumber}`}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/invoices/${invoice.id}`} aria-label={`View ${invoice.formattedNumber}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DataView>
      )}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteCopy.title}
        description={deleteCopy.description}
        confirmLabel="Delete invoice"
        pending={Boolean(deleting)}
        destructive
        onConfirm={() => deleteTarget && void deleteInvoiceRecord(deleteTarget)}
      />
    </div>
  );
}

function InvoiceFilters({
  query,
  filter,
  onQuery,
  onFilter,
}: {
  query: string;
  filter: Filter;
  onQuery: (value: string) => void;
  onFilter: (value: Filter) => void;
}) {
  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search invoice or client"
          className="pl-9"
          aria-label="Search invoices"
        />
      </div>
      <Select
        value={filter}
        onChange={(event) => onFilter(event.target.value as Filter)}
        className="sm:w-48"
        aria-label="Filter invoices by status"
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="viewed">Viewed</option>
        <option value="payment_pending">Payment pending</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
        <option value="void">Void</option>
      </Select>
    </>
  );
}
