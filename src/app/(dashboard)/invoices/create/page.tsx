import { InvoiceForm } from "@/components/invoicing/invoice-form";
import { getInvoiceTemplate } from "@/lib/invoicing/templates";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    templateId?: string | string[];
    duplicate?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedTemplate = Array.isArray(params.templateId)
    ? params.templateId[0]
    : params.templateId;
  const initialTemplateId = requestedTemplate
    ? getInvoiceTemplate(requestedTemplate).id
    : undefined;
  const requestedDuplicate = Array.isArray(params.duplicate)
    ? params.duplicate[0]
    : params.duplicate;
  const draftStorageId =
    requestedDuplicate && /^[A-Za-z0-9_-]{1,128}$/.test(requestedDuplicate)
      ? `duplicate:${requestedDuplicate}`
      : undefined;

  return (
    <InvoiceForm
      initialTemplateId={initialTemplateId}
      draftStorageId={draftStorageId}
    />
  );
}
