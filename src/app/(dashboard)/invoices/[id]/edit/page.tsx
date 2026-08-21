"use client";

import { useParams } from "next/navigation";
import { InvoiceForm } from "@/components/invoicing/invoice-form";
import { ErrorState, LoadingState } from "@/components/invoicing/invoice-ui";
import { useInvoicingData } from "@/components/invoicing/api";
import type { Invoice } from "@/types/invoicing";

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { data, error, isLoading, mutate } = useInvoicingData<Invoice>(
    `/api/invoicing/invoices/${encodeURIComponent(id)}`,
    ["invoice"]
  );

  if (isLoading) return <LoadingState rows={6} />;
  if (error || !data) {
    return <ErrorState message={error?.message || "Invoice not found."} onRetry={() => mutate()} />;
  }
  if (data.status !== "draft") {
    return <ErrorState message="Only draft invoices can be edited." />;
  }

  return <InvoiceForm invoice={data} />;
}
