import Image from "next/image";
import { getInvoiceTemplate } from "@/lib/invoicing/templates";
import { cn } from "@/lib/utils";

export function TemplatePreviewArtwork({
  templateId,
  compact = false,
  full = false,
  className,
}: {
  templateId: string;
  compact?: boolean;
  full?: boolean;
  className?: string;
}) {
  const template = getInvoiceTemplate(templateId);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-white",
        full ? "aspect-[3/4]" : compact ? "h-36" : "h-56",
        className
      )}
      style={{ backgroundColor: template.surface }}
      aria-hidden="true"
    >
      <Image
        src={`/template-previews/${template.id}-${full ? "full" : "preview"}.png`}
        alt=""
        fill
        sizes={
          full
            ? "(max-width: 768px) 92vw, 768px"
            : compact
              ? "(max-width: 640px) 45vw, 220px"
              : "(max-width: 1024px) 45vw, 360px"
        }
        className={full ? "object-contain" : "object-cover object-top"}
      />
    </div>
  );
}
