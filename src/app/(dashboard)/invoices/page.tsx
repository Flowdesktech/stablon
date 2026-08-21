"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FilePlus2, Search, Trash2 } from "lucide-react";
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
} from "@/components/invoicing/invoice-ui";
import { Select } from "@/components/ui/field";
import { invoicingRequest, useInvoicingData } from "@/components/invoicing/api";
import type { Invoice, InvoiceStatus } from "@/types/invoicing";

type Filter = "all" | InvoiceStatus;

export default function InvoicesPage() {
  const { data: invoices, error, isLoading, mutate } = useInvoicingData<Invoice[]>(
    "/api/invoicing/invoices",
    ["invoices"]
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (invoices || []).filter((invoice) => {
      const matchesStatus = filter === "all" || invoice.status === filter;
      const matchesQuery =
        !needle ||
        invoice.formattedNumber.toLowerCase().includes(needle) ||
        invoice.clientSnapshot.name.toLowerCase().includes(needle) ||
        invoice.clientSnapshot.company?.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [filter, invoices, query]);

  const outstanding = (invoices || []).filter(
    (invoice) => !["draft", "paid", "void", "refunded"].includes(invoice.status)
  );
  const paid = (invoices || []).filter((invoice) => invoice.paymentStatus === "paid");

  async function deleteDraft(invoice: Invoice) {
    setDeleting(invoice.id);
    try {
      await invoicingRequest(`/api/invoicing/invoices/${invoice.id}`, { method: "DELETE" });
      await mutate();
      setDeleteTarget(null);
      toast({ variant: "success", title: "Draft deleted" });
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

      {!isLoading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total invoices" value={invoices?.length || 0} />
          <StatCard label="Outstanding" value={outstanding.length} />
          <StatCard label="Paid" value={paid.length} />
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
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
                    <p className="font-medium text-foreground">{invoice.formattedNumber}</p>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {invoice.clientSnapshot.name}
                    {invoice.clientSnapshot.company ? ` · ${invoice.clientSnapshot.company}` : ""}
                    {" · "}Due {new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <p className="mr-2 font-semibold tabular-nums text-foreground">
                    {formatInvoiceMoney(invoice.totals.total, invoice.currency)}
                  </p>
                  {invoice.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleting === invoice.id}
                      onClick={() => setDeleteTarget(invoice)}
                      aria-label={`Delete ${invoice.formattedNumber}`}
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
        title="Delete draft invoice?"
        description={`${deleteTarget?.formattedNumber || "This draft"} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete draft"
        pending={Boolean(deleting)}
        destructive
        onConfirm={() => deleteTarget && void deleteDraft(deleteTarget)}
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
