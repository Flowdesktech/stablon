export const INVOICE_PAGE = {
  widthPx: 793.7,
  heightPx: 1122.52,
  marginPx: 45.35,
  contentWidthPx: 703,
  contentHeightPx: 1031.82,
  minimumScale: 0.7,
} as const;

export interface InvoiceFit {
  fits: boolean;
  scale: number;
  naturalWidth: number;
  naturalHeight: number;
}

export function calculateInvoiceFit(
  naturalWidth: number,
  naturalHeight: number
): InvoiceFit {
  const safeWidth = Number.isFinite(naturalWidth) && naturalWidth > 0 ? naturalWidth : 1;
  const safeHeight = Number.isFinite(naturalHeight) && naturalHeight > 0 ? naturalHeight : 1;
  const scale = Math.min(
    1,
    INVOICE_PAGE.contentWidthPx / safeWidth,
    INVOICE_PAGE.contentHeightPx / safeHeight
  );

  return {
    fits: scale >= INVOICE_PAGE.minimumScale,
    scale: Math.max(Math.min(scale, 1), INVOICE_PAGE.minimumScale),
    naturalWidth: safeWidth,
    naturalHeight: safeHeight,
  };
}
