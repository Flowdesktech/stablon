"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CircleStop,
  History,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  X,
  Zap,
} from "lucide-react";
import { invoicingRequest, jsonBody, useInvoicingData } from "@/components/invoicing/api";
import { InvoicePreview } from "@/components/invoicing/invoice-preview";
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeading,
  SubmitButton,
  formatInvoiceMoney,
  selectClassName,
} from "@/components/invoicing/invoice-ui";
import {
  LineItemEditor,
  type EditableLineItem,
} from "@/components/invoicing/line-item-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { calculateInvoiceTotals } from "@/lib/invoicing/money";
import type { InvoiceFit } from "@/lib/invoicing/page-fit";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";
import type {
  Invoice,
  InvoiceClient,
  InvoiceProfile,
  RecurringFrequency,
  RecurringInvoice,
} from "@/types/invoicing";

interface ScheduleForm {
  profileId: string;
  clientId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
  autoSend: boolean;
  dueDateDuration: number;
  currency: string;
  lineItems: EditableLineItem[];
  taxRate: string;
  discountType: "none" | "percent" | "fixed";
  discountValue: string;
  notes: string;
  paymentTerms: string;
  templateId: string;
}

interface RecurringDetails {
  recurringInvoice: RecurringInvoice;
  generatedInvoices: Invoice[];
}

const frequencies: Array<{ value: RecurringFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(profile?: InvoiceProfile): ScheduleForm {
  return {
    profileId: profile?.id || "",
    clientId: "",
    frequency: "monthly",
    startDate: today(),
    endDate: "",
    autoSend: false,
    dueDateDuration: profile?.settings.dueDateDuration ?? 7,
    currency: profile?.settings.currency || "USD",
    lineItems: [{ description: "", quantity: "1", rate: "0" }],
    taxRate: profile?.settings.taxRate || "0",
    discountType: "none",
    discountValue: "0",
    notes: "",
    paymentTerms: profile?.settings.paymentTerms || "Due on receipt",
    templateId: profile?.settings.templateId || "modern-blue",
  };
}

function scheduleForm(schedule: RecurringInvoice): ScheduleForm {
  return {
    profileId: schedule.profileId,
    clientId: schedule.clientId,
    frequency: schedule.frequency,
    startDate: schedule.startDate,
    endDate: schedule.endDate || "",
    autoSend: schedule.autoSend,
    dueDateDuration: schedule.dueDateDuration,
    currency: schedule.currency,
    lineItems: schedule.lineItems,
    taxRate: schedule.taxRate,
    discountType: schedule.discountType,
    discountValue: schedule.discountValue,
    notes: schedule.notes,
    paymentTerms: schedule.paymentTerms,
    templateId: schedule.templateId,
  };
}

function scheduleState(schedule: RecurringInvoice): {
  label: string;
  variant: "success" | "warning" | "secondary";
} {
  if (!schedule.active) return { label: "Stopped", variant: "secondary" };
  if (schedule.pausedUntil) return { label: "Paused", variant: "warning" };
  return { label: "Active", variant: "success" };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function RecurringManager() {
  const {
    data: schedules,
    error: schedulesError,
    isLoading: schedulesLoading,
    mutate: mutateSchedules,
  } = useInvoicingData<RecurringInvoice[]>("/api/invoicing/recurring");
  const { data: profiles } =
    useInvoicingData<InvoiceProfile[]>("/api/invoicing/profiles");
  const { data: clients } =
    useInvoicingData<InvoiceClient[]>("/api/invoicing/clients");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pauseDates, setPauseDates] = useState<Record<string, string>>({});
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, Invoice[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [stopTarget, setStopTarget] = useState<RecurringInvoice | null>(null);
  const [pageFit, setPageFit] = useState<InvoiceFit | null>(null);

  useEffect(() => {
    if (!form.profileId && profiles?.length) {
      const profile = profiles.find((item) => item.isDefault) || profiles[0];
      setForm(emptyForm(profile));
    }
  }, [form.profileId, profiles]);

  const eligibleClients = useMemo(
    () => (clients || []).filter((client) => client.profileId === form.profileId),
    [clients, form.profileId]
  );
  const profileNames = useMemo(
    () => new Map((profiles || []).map((profile) => [profile.id, profile.name])),
    [profiles]
  );
  const clientNames = useMemo(
    () => new Map((clients || []).map((client) => [client.id, client.name])),
    [clients]
  );
  const selectedProfile = profiles?.find((profile) => profile.id === form.profileId);
  const selectedClient = clients?.find((client) => client.id === form.clientId);
  const previewInvoice = useMemo<RenderableInvoice | null>(() => {
    if (!selectedProfile || !selectedClient) return null;
    const lineItems = form.lineItems.map((item, index) => ({
      id: item.id || `recurring-preview-${index}`,
      description: item.description.trim() || "Service or product",
      quantity:
        Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
          ? item.quantity
          : "1",
      rate:
        Number.isFinite(Number(item.rate)) && Number(item.rate) >= 0
          ? item.rate
          : "0",
    }));
    const taxRate =
      Number.isFinite(Number(form.taxRate)) &&
      Number(form.taxRate) >= 0 &&
      Number(form.taxRate) <= 100
        ? form.taxRate
        : "0";
    const safeDiscountValue =
      Number.isFinite(Number(form.discountValue)) && Number(form.discountValue) >= 0
        ? form.discountValue
        : "0";
    const discountValue =
      form.discountType === "percent"
        ? String(Math.min(Number(safeDiscountValue), 100))
        : safeDiscountValue;
    const computed = calculateInvoiceTotals(
      lineItems,
      form.currency || "USD",
      taxRate,
      form.discountType,
      discountValue
    );
    const dueDate = new Date(`${form.startDate || today()}T12:00:00Z`);
    dueDate.setUTCDate(dueDate.getUTCDate() + form.dueDateDuration);

    return {
      formattedNumber: `${selectedProfile.settings.prefix}-PREVIEW`,
      issueDate: form.startDate || today(),
      dueDate: dueDate.toISOString().slice(0, 10),
      currency: form.currency || "USD",
      lineItems: computed.lineItems,
      totals: computed.totals,
      notes: form.notes,
      paymentTerms: form.paymentTerms,
      templateId: form.templateId,
      sender: {
        profileId: selectedProfile.id,
        displayName: selectedProfile.displayName,
        company: selectedProfile.company,
        email: selectedProfile.email,
        phone: selectedProfile.phone,
        address: selectedProfile.address,
        logoUrl: selectedProfile.logoUrl,
      },
      client: {
        clientId: selectedClient.id,
        name: selectedClient.name,
        company: selectedClient.company,
        email: selectedClient.email,
        phone: selectedClient.phone,
        address: selectedClient.address,
      },
    };
  }, [form, selectedClient, selectedProfile]);

  function startCreate() {
    const profile = profiles?.find((item) => item.isDefault) || profiles?.[0];
    setEditingId(null);
    setForm(emptyForm(profile));
    setPageFit(null);
    setShowForm(true);
  }

  function startEdit(schedule: RecurringInvoice) {
    setEditingId(schedule.id);
    setForm(scheduleForm(schedule));
    setPageFit(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseProfile(profileId: string) {
    const profile = profiles?.find((item) => item.id === profileId);
    setForm((current) => ({
      ...current,
      profileId,
      clientId: "",
      currency: profile?.settings.currency || current.currency,
      taxRate: profile?.settings.taxRate || current.taxRate,
      dueDateDuration:
        profile?.settings.dueDateDuration ?? current.dueDateDuration,
      paymentTerms: profile?.settings.paymentTerms || current.paymentTerms,
      templateId: profile?.settings.templateId || current.templateId,
    }));
  }

  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault();
    if (!pageFit?.fits) {
      toast({
        variant: "error",
        title: pageFit ? "Recurring invoice is too long" : "Checking invoice layout",
        description: pageFit
          ? "Shorten the line items or notes so every generated invoice fits on one readable A4 page."
          : "Wait for the one-page preview check to finish.",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        endDate: form.endDate || undefined,
      };
      await invoicingRequest<RecurringInvoice>(
        editingId
          ? `/api/invoicing/recurring/${editingId}`
          : "/api/invoicing/recurring",
        {
          method: editingId ? "PUT" : "POST",
          ...jsonBody(payload),
        }
      );
      toast({
        variant: "success",
        title: editingId ? "Recurring invoice updated" : "Recurring invoice created",
      });
      setShowForm(false);
      setEditingId(null);
      await mutateSchedules();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not save recurring invoice",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    schedule: RecurringInvoice,
    action: "pause" | "resume" | "stop" | "generate-now"
  ) {
    setBusyId(schedule.id);
    try {
      const body =
        action === "pause"
          ? jsonBody({ pausedUntil: pauseDates[schedule.id] || undefined })
          : undefined;
      const result = await invoicingRequest<RecurringInvoice | Invoice>(
        `/api/invoicing/recurring/${schedule.id}/${action}`,
        { method: "POST", ...body }
      );
      toast({
        variant: "success",
        title:
          action === "generate-now"
            ? `Generated ${(result as Invoice).formattedNumber}`
            : action === "pause"
              ? "Recurring invoice paused"
              : action === "resume"
                ? "Recurring invoice resumed"
                : "Recurring invoice stopped",
      });
      await mutateSchedules();
      if (action === "stop") setStopTarget(null);
      if (action === "generate-now" && historyId === schedule.id) {
        await loadHistory(schedule.id, true);
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function loadHistory(id: string, force = false) {
    if (historyId === id && !force) {
      setHistoryId(null);
      return;
    }
    setHistoryId(id);
    if (history[id] && !force) return;
    setHistoryLoading(id);
    try {
      const details = await invoicingRequest<RecurringDetails>(
        `/api/invoicing/recurring/${id}`
      );
      setHistory((current) => ({
        ...current,
        [id]: details.generatedInvoices,
      }));
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load generated invoices",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setHistoryLoading(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeading
        title="Recurring invoices"
        description="Schedule invoices, pause billing, and review every generated occurrence."
        action={
          <Button onClick={showForm ? () => setShowForm(false) : startCreate}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "New schedule"}
          </Button>
        }
      />

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit recurring invoice" : "Create recurring invoice"}
            </CardTitle>
            <CardDescription>
              Dates are evaluated in the selected profile&apos;s timezone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveSchedule}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Invoice profile">
                  <select
                    className={selectClassName}
                    required
                    value={form.profileId}
                    onChange={(event) => chooseProfile(event.target.value)}
                  >
                    <option value="">Select a profile</option>
                    {(profiles || []).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Client">
                  <select
                    className={selectClassName}
                    required
                    value={form.clientId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clientId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a client</option>
                    {eligibleClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frequency">
                  <select
                    className={selectClassName}
                    value={form.frequency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        frequency: event.target.value as RecurringFrequency,
                      }))
                    }
                  >
                    {frequencies.map((frequency) => (
                      <option key={frequency.value} value={frequency.value}>
                        {frequency.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <Input
                    required
                    maxLength={3}
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Start date">
                  <Input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="End date" hint="Optional">
                  <Input
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Payment due after">
                  <div className="relative">
                    <Input
                      required
                      min={0}
                      max={365}
                      type="number"
                      value={form.dueDateDuration}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dueDateDuration: Number(event.target.value),
                        }))
                      }
                    />
                    <span className="pointer-events-none absolute right-4 top-3 text-sm text-muted-foreground">
                      days
                    </span>
                  </div>
                </Field>
              </div>

              <div className="space-y-2">
                <LineItemEditor
                  items={form.lineItems}
                  currency={form.currency}
                  onChange={(lineItems) =>
                    setForm((current) => ({ ...current, lineItems }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Descriptions support {"{{PERIOD_START}}"}, {"{{PERIOD_END}}"},{" "}
                  {"{{MONTH_NAME}}"}, {"{{YEAR}}"}, {"{{WEEK_NUMBER}}"} and{" "}
                  {"{{QUARTER}}"}.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tax rate (%)">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={form.taxRate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        taxRate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Discount">
                  <select
                    className={selectClassName}
                    value={form.discountType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discountType: event.target.value as ScheduleForm["discountType"],
                      }))
                    }
                  >
                    <option value="none">No discount</option>
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </Field>
                <Field label="Discount value">
                  <Input
                    disabled={form.discountType === "none"}
                    type="number"
                    min={0}
                    step="any"
                    value={form.discountValue}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Payment terms">
                  <Input
                    value={form.paymentTerms}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paymentTerms: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Template">
                  <Input
                    value={form.templateId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        templateId: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </Field>

              <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4">
                <input
                  className="mt-1 h-4 w-4 accent-primary"
                  type="checkbox"
                  checked={form.autoSend}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      autoSend: event.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Send className="h-4 w-4 text-primary" /> Email generated
                    invoices automatically
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Each generated invoice is published and emailed once. Failed deliveries
                    are retried by the daily scheduler.
                  </span>
                </span>
              </label>

              {!previewInvoice ? (
                <p className="text-xs text-muted-foreground">
                  Select a profile and client to check one-page A4 fit.
                </p>
              ) : !pageFit ? (
                <p className="text-xs text-muted-foreground">Checking one-page A4 fit…</p>
              ) : !pageFit.fits ? (
                <p role="alert" className="text-xs leading-5 text-danger">
                  This recurring invoice is too long for one readable A4 page. Shorten the line
                  items or notes before saving.
                </p>
              ) : (
                <p className="text-xs text-success">Generated invoices fit on one A4 page.</p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <SubmitButton pending={saving} disabled={!pageFit?.fits} type="submit">
                  {editingId ? "Save changes" : "Create schedule"}
                </SubmitButton>
              </div>
              {previewInvoice ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none fixed left-[-10000px] top-0 w-[794px] opacity-0"
                >
                  <InvoicePreview
                    invoice={previewInvoice}
                    paymentUrl="https://stablon.app/pay/preview"
                    onFitChange={setPageFit}
                  />
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      )}

      {schedulesLoading ? (
        <LoadingState rows={4} />
      ) : schedulesError ? (
        <ErrorState
          message={schedulesError.message}
          onRetry={() => void mutateSchedules()}
        />
      ) : !schedules?.length ? (
        <EmptyState
          title="No recurring invoices yet"
          description="Create a schedule to generate invoices automatically on your billing cadence."
        />
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const state = scheduleState(schedule);
            const isBusy = busyId === schedule.id;
            const generated = history[schedule.id] || [];
            const amount = schedule.lineItems.reduce(
              (sum, item) => sum + Number(item.quantity) * Number(item.rate),
              0
            );
            return (
              <Card key={schedule.id}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-info-muted">
                          <CalendarClock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-foreground">
                              {clientNames.get(schedule.clientId) || "Client"}
                            </h2>
                            <Badge variant={state.variant}>{state.label}</Badge>
                            {schedule.autoSend && <Badge>Auto-send</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {profileNames.get(schedule.profileId) || "Invoice profile"} ·{" "}
                            {frequencies.find(
                              (frequency) => frequency.value === schedule.frequency
                            )?.label || schedule.frequency}{" "}
                            · approximately{" "}
                            {formatInvoiceMoney(amount, schedule.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {schedule.active && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => void runAction(schedule, "generate-now")}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Zap className="h-3.5 w-3.5" />
                              )}
                              Generate now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => startEdit(schedule)}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Next invoice</p>
                        <p className="mt-1 text-sm text-foreground">
                          {schedule.active ? formatDate(schedule.nextGenerationDate) : "Stopped"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">End date</p>
                        <p className="mt-1 text-sm text-foreground">
                          {formatDate(schedule.endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last generated</p>
                        <p className="mt-1 text-sm text-foreground">
                          {formatDate(schedule.lastGeneratedDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Generated invoices</p>
                        <p className="mt-1 text-sm text-foreground">
                          {schedule.totalGenerated}
                        </p>
                      </div>
                    </div>

                    {schedule.active && (
                      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        {schedule.pausedUntil ? (
                          <div className="flex items-center gap-2 text-sm text-warning">
                            <Pause className="h-4 w-4" />
                            {schedule.pausedUntil === "9999-12-31"
                              ? "Paused indefinitely"
                              : `Paused through ${formatDate(schedule.pausedUntil)}`}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              aria-label="Pause through date"
                              className="h-9 w-44 text-xs"
                              min={today()}
                              type="date"
                              value={pauseDates[schedule.id] || ""}
                              onChange={(event) =>
                                setPauseDates((current) => ({
                                  ...current,
                                  [schedule.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => void runAction(schedule, "pause")}
                            >
                              <Pause className="h-3.5 w-3.5" />
                              {pauseDates[schedule.id] ? "Pause through date" : "Pause"}
                            </Button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {schedule.pausedUntil && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => void runAction(schedule, "resume")}
                            >
                              <Play className="h-3.5 w-3.5" /> Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            disabled={isBusy}
                            onClick={() => setStopTarget(schedule)}
                          >
                            <CircleStop className="h-3.5 w-3.5" /> Stop
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void loadHistory(schedule.id)}
                      >
                        <History className="h-3.5 w-3.5" />
                        Generated history
                        {historyId === schedule.id ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {historyId === schedule.id && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-border">
                          {historyLoading === schedule.id ? (
                            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                              <RefreshCw className="h-4 w-4 animate-spin" /> Loading history…
                            </div>
                          ) : generated.length ? (
                            generated.map((invoice) => (
                              <div
                                key={invoice.id}
                                className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {invoice.formattedNumber}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Issued {formatDate(invoice.issueDate)} · Due{" "}
                                    {formatDate(invoice.dueDate)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      invoice.status === "sent" ? "default" : "secondary"
                                    }
                                  >
                                    {invoice.status}
                                  </Badge>
                                  <span className="text-sm font-medium tabular-nums text-foreground">
                                    {formatInvoiceMoney(
                                      invoice.totals.total,
                                      invoice.currency
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="p-4 text-sm text-muted-foreground">
                              No invoices have been generated yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(stopTarget)}
        onOpenChange={(open) => !open && setStopTarget(null)}
        title="Stop recurring invoice?"
        description="No new invoices will be generated from this schedule. Existing invoices are not affected."
        confirmLabel="Stop schedule"
        pending={Boolean(stopTarget && busyId === stopTarget.id)}
        destructive
        onConfirm={() => {
          if (!stopTarget) return;
          void runAction(stopTarget, "stop");
        }}
      />
    </div>
  );
}
