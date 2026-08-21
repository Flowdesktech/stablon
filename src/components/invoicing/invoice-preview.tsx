"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";
import {
  calculateInvoiceFit,
  INVOICE_PAGE,
  type InvoiceFit,
} from "@/lib/invoicing/page-fit";
import { cn } from "@/lib/utils";

export function InvoicePreview({
  invoice,
  paymentUrl,
  onFitChange,
  className,
}: {
  invoice: RenderableInvoice;
  paymentUrl?: string;
  onFitChange?: (fit: InvoiceFit | null) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fitCallbackRef = useRef(onFitChange);
  const [html, setHtml] = useState("");
  const [frameScale, setFrameScale] = useState(1);
  const [fit, setFit] = useState<InvoiceFit | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fitCallbackRef.current = onFitChange;
  }, [onFitChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      setFrameScale(Math.min(container.clientWidth / INVOICE_PAGE.widthPx, 1));
    };
    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setError("");
      setFit(null);
      fitCallbackRef.current?.(null);

      try {
        const response = await fetch("/api/invoice-generator/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice, ...(paymentUrl ? { paymentUrl } : {}) }),
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => ({}))) as {
          html?: string;
          error?: string;
        };
        if (!response.ok || !body.html) {
          throw new Error(body.error || "Could not render the invoice preview");
        }
        setHtml(body.html);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Could not render the invoice preview");
        fitCallbackRef.current?.(null);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [invoice, paymentUrl]);

  const measureContent = useCallback(() => {
    const frame = iframeRef.current;
    const document = frame?.contentDocument;
    if (!document) return;

    const root =
      document.getElementById("invoice-print-root") ||
      document.querySelector<HTMLElement>(".invoice-container") ||
      document.body;
    if (!root) return;

    document.documentElement.style.width = `${INVOICE_PAGE.widthPx}px`;
    document.documentElement.style.minHeight = `${INVOICE_PAGE.heightPx}px`;
    document.documentElement.style.overflow = "hidden";
    document.body.style.width = `${INVOICE_PAGE.widthPx}px`;
    document.body.style.minHeight = `${INVOICE_PAGE.heightPx}px`;
    document.body.style.padding = `${INVOICE_PAGE.marginPx}px`;
    document.body.style.boxSizing = "border-box";
    document.body.style.overflow = "hidden";
    root.style.zoom = "1";

    window.requestAnimationFrame(() => {
      const naturalWidth = Math.max(root.scrollWidth, root.getBoundingClientRect().width);
      const naturalHeight = Math.max(root.scrollHeight, root.getBoundingClientRect().height);
      const nextFit = calculateInvoiceFit(naturalWidth, naturalHeight);
      root.style.zoom = String(nextFit.scale);
      setFit(nextFit);
      fitCallbackRef.current?.(nextFit);
    });
  }, []);

  const previewHeight = Math.max(INVOICE_PAGE.heightPx * frameScale, 1);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-white shadow-[var(--shadow-md)]"
        style={{ height: previewHeight }}
      >
        {html ? (
          <iframe
            ref={iframeRef}
            title={`Preview of invoice ${invoice.formattedNumber}`}
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={measureContent}
            className="absolute left-0 top-0 border-0 bg-white"
            style={{
              width: INVOICE_PAGE.widthPx,
              height: INVOICE_PAGE.heightPx,
              transform: `scale(${frameScale})`,
              transformOrigin: "top left",
            }}
          />
        ) : null}

        {!html && !error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-muted text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Rendering preview
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-muted px-6 text-center">
            <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">Preview unavailable</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{error}</p>
          </div>
        ) : null}
      </div>

      {fit && !fit.fits ? (
        <div className="flex gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-2 text-xs leading-5 text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          This invoice does not fit on one readable A4 page. Shorten line-item descriptions,
          remove items, or reduce the notes before saving or downloading.
        </div>
      ) : null}
    </div>
  );
}
