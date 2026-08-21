"use client";

import Link from "next/link";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page";
import { selectClassName as sharedSelectClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/invoicing";

const statusVariants: Record<
  InvoiceStatus,
  "default" | "success" | "warning" | "danger" | "secondary"
> = {
  draft: "secondary",
  sent: "default",
  viewed: "default",
  payment_pending: "warning",
  paid: "success",
  overdue: "danger",
  void: "secondary",
  payment_failed: "danger",
  refunded: "warning",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      {status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
    </Badge>
  );
}

export function invoiceDeletionCopy(
  invoice:
    | {
        formattedNumber: string;
        status: InvoiceStatus;
      }
    | null
    | undefined
) {
  if (!invoice || invoice.status === "draft") {
    return {
      title: "Delete draft invoice?",
      description: `${
        invoice?.formattedNumber || "This draft"
      } will be permanently deleted. This action cannot be undone.`,
    };
  }

  const status = invoice.status.replaceAll("_", " ");
  return {
    title: `Permanently delete ${status} invoice?`,
    description: `Warning: ${invoice.formattedNumber} is a ${status} invoice. Its public link and in-app activity will be permanently removed. Sent emails and downloaded PDFs cannot be recalled, and deletion does not reverse payments or refunds. Export any records you need before continuing. This action cannot be undone.`,
  };
}

export function formatInvoiceMoney(value: string | number, currency = "USD") {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${currency}`;
  }
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <PageHeader title={title} description={description} actions={action} />
  );
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="skeleton h-14" />
        ))}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-danger/25">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <div>
          <p className="font-medium text-foreground">We couldn&apos;t load this page</p>
          <p className="mt-1 text-sm text-muted-foreground">{message || "Please try again."}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info-muted">
          <FileText className="h-6 w-6 text-info" />
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {href && actionLabel && (
          <Button asChild size="sm">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SubmitButton({
  pending,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button {...props} disabled={pending || disabled}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <SubmitButton
            type="button"
            variant={destructive ? "destructive" : "default"}
            pending={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </SubmitButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const selectClassName = sharedSelectClassName;
