import { InvoiceForm } from "@/components/invoicing/invoice-form";
import { getInvoiceTemplate } from "@/lib/invoicing/templates";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedTemplate = Array.isArray(params.templateId)
    ? params.templateId[0]
    : params.templateId;
  const initialTemplateId = requestedTemplate
    ? getInvoiceTemplate(requestedTemplate).id
    : undefined;

  return <InvoiceForm initialTemplateId={initialTemplateId} />;
}
