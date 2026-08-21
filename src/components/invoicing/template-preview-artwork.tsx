import { InvoicePreview } from "@/components/invoicing/invoice-preview";
import { sampleRenderableInvoice } from "@/lib/invoicing/sample";
import { getInvoiceTemplate } from "@/lib/invoicing/templates";
import { cn } from "@/lib/utils";

export function TemplatePreviewArtwork({
  templateId,
  compact = false,
}: {
  templateId: string;
  compact?: boolean;
}) {
  const template = getInvoiceTemplate(templateId);
  const invoice = sampleRenderableInvoice(template.id);
  const scale = compact ? 0.18 : 0.3;

  return (
    <div
      className={cn(
        "relative flex w-full justify-center overflow-hidden",
        compact ? "h-36" : "h-56"
      )}
      style={{ backgroundColor: template.surface }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-3 w-[720px] shrink-0"
        style={{
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <InvoicePreview invoice={invoice} />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{
          background: `linear-gradient(to bottom, transparent, ${template.surface})`,
        }}
      />
    </div>
  );
}
