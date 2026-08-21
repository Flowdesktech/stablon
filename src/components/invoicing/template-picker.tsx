"use client";

import { Check, Eye } from "lucide-react";
import { TemplatePreviewArtwork } from "@/components/invoicing/template-preview-artwork";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";
import { cn } from "@/lib/utils";

export function TemplatePicker({
  value,
  onChange,
  onPreview,
  compact = false,
}: {
  value: string;
  onChange: (templateId: string) => void;
  onPreview?: (templateId: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {INVOICE_TEMPLATES.map((template) => {
        const selected = value === template.id;

        if (compact) {
          return (
            <button
              type="button"
              key={template.id}
              onClick={() => onChange(template.id)}
              aria-pressed={selected}
              className={cn(
                "group overflow-hidden rounded-lg border bg-surface text-left shadow-[var(--shadow-sm)] transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                selected ? "border-primary ring-1 ring-primary/25" : "border-border"
              )}
            >
              <div className="relative">
                <TemplatePreviewArtwork templateId={template.id} compact />
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {template.category}
                </span>
              </div>
            </button>
          );
        }

        return (
          <article
            key={template.id}
            className={cn(
              "group overflow-hidden rounded-lg border bg-surface text-left shadow-[var(--shadow-sm)] transition-colors hover:border-border-strong",
              selected
                ? "border-primary ring-1 ring-primary/25"
                : "border-border"
            )}
          >
            <button
              type="button"
              onClick={() => onChange(template.id)}
              aria-pressed={selected}
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
            >
              <div className="relative">
                <TemplatePreviewArtwork templateId={template.id} />
              {selected && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {template.category}
                </span>
              </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
            </div>
            </button>
            <div className="grid grid-cols-2 gap-2 border-t border-border bg-surface-muted p-3">
              {onPreview ? (
                <button
                  type="button"
                  onClick={() => onPreview(template.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => onChange(template.id)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:border-primary-hover hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Check className="h-3.5 w-3.5" /> {selected ? "Selected" : "Use"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
