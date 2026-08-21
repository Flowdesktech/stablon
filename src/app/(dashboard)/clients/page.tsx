"use client";

import { useMemo, useState } from "react";
import { Edit3, Mail, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState, DataToolbar, DataView } from "@/components/ui/data-view";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ClientDialog } from "@/components/invoicing/client-dialog";
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
} from "@/components/invoicing/invoice-ui";
import { invoicingRequest, useInvoicingData } from "@/components/invoicing/api";
import type { InvoiceClient, InvoiceProfile } from "@/types/invoicing";

export default function ClientsPage() {
  const { data: clients, error, isLoading, mutate } = useInvoicingData<InvoiceClient[]>(
    "/api/invoicing/clients",
    ["clients"]
  );
  const { data: profiles, error: profilesError } = useInvoicingData<InvoiceProfile[]>(
    "/api/invoicing/profiles",
    ["profiles"]
  );
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<InvoiceClient | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceClient | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients || [];
    return (clients || []).filter((client) =>
      [client.name, client.company, client.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    );
  }, [clients, query]);

  function openClient(client?: InvoiceClient) {
    setSelected(client || null);
    setDialogOpen(true);
  }

  async function deleteClient(client: InvoiceClient) {
    setDeleting(client.id);
    try {
      await invoicingRequest(`/api/invoicing/clients/${client.id}`, { method: "DELETE" });
      await mutate();
      setDeleteTarget(null);
      toast({ variant: "success", title: "Client deleted" });
    } catch (deleteError) {
      toast({
        variant: "error",
        title: "Client not deleted",
        description: deleteError instanceof Error ? deleteError.message : "Please try again.",
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Clients"
        description="Manage the customers and businesses you invoice."
        action={
          <Button onClick={() => openClient()} disabled={!profiles?.length}>
            <Plus className="h-4 w-4" /> Add client
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState rows={5} />
      ) : error || profilesError ? (
        <ErrorState message={(error || profilesError)?.message} onRetry={() => mutate()} />
      ) : !clients?.length ? (
        <EmptyState
          title="No clients yet"
          description={
            profiles?.length
              ? "Add your first client to start creating invoices."
              : "Create an invoice profile in invoicing settings before adding clients."
          }
        />
      ) : !filtered.length ? (
        <DataView>
          <DataToolbar>
            <ClientSearch query={query} onQuery={setQuery} />
          </DataToolbar>
          <DataState title="No matching clients" description="Try a different search term." />
        </DataView>
      ) : (
        <DataView>
          <DataToolbar>
            <ClientSearch query={query} onQuery={setQuery} />
            <span className="shrink-0 text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "client" : "clients"}
            </span>
          </DataToolbar>
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-5 border-b border-border bg-surface-muted px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Client</span>
            <span>Contact</span>
            <span>Location</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-border" role="list">
            {filtered.map((client) => (
              <li
                key={client.id}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-surface-subtle sm:px-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-info-muted text-sm font-semibold text-primary"
                    aria-hidden="true"
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{client.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {client.company || "Individual"}
                    </p>
                  </div>
                </div>

                <a
                  href={`mailto:${client.email}`}
                  className="flex min-w-0 items-center gap-2 text-sm text-primary hover:text-primary-hover"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{client.email}</span>
                </a>

                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {[client.address.city, client.address.subdivision, client.address.country]
                      .filter(Boolean)
                      .join(", ") || "No billing address"}
                  </span>
                </div>

                <div className="flex items-center gap-1 md:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openClient(client)}
                    aria-label={`Edit ${client.name}`}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleting === client.id}
                        onClick={() => setDeleteTarget(client)}
                        aria-label={`Delete ${client.name}`}
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                </div>
              </li>
            ))}
          </ul>
        </DataView>
      )}

      {profiles && (
        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={selected}
          profiles={profiles}
          onSaved={async () => {
            await mutate();
          }}
        />
      )}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete client?"
        description={`${deleteTarget?.name || "This client"} will be removed from your saved clients. Existing invoices are not changed.`}
        confirmLabel="Delete client"
        pending={Boolean(deleting)}
        destructive
        onConfirm={() => deleteTarget && void deleteClient(deleteTarget)}
      />
    </div>
  );
}

function ClientSearch({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xl">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search clients"
        className="pl-9"
        aria-label="Search clients"
      />
    </div>
  );
}
