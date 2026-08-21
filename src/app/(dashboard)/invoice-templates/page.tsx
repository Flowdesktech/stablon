"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeading } from "@/components/invoicing/invoice-ui";
import { InvoicePreview } from "@/components/invoicing/invoice-preview";
import { TemplatePicker } from "@/components/invoicing/template-picker";
import { getInvoiceTemplate } from "@/lib/invoicing/templates";
import { sampleRenderableInvoice } from "@/lib/invoicing/sample";

export default function InvoiceTemplatesPage() {
  const [selected, setSelected] = useState("modern-blue");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const template = getInvoiceTemplate(selected);
  const previewTemplate = previewId ? getInvoiceTemplate(previewId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Invoice templates"
        description="Choose from 15 polished layouts for every kind of business."
        action={
          <Button asChild variant="outline">
            <Link href="/invoicing-settings">
              <Settings2 className="h-4 w-4" /> Set profile default
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 border-l-4 border-primary p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selected template
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{template.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          </div>
          <Button asChild>
            <Link href={`/invoices/create?templateId=${selected}`}>
              Create invoice <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <TemplatePicker value={selected} onChange={setSelected} onPreview={setPreviewId} />

      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-h-[94vh] w-[min(calc(100vw-2rem),72rem)] overflow-y-auto p-4 sm:p-6">
          {previewTemplate ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle>{previewTemplate.name}</DialogTitle>
                <DialogDescription>{previewTemplate.description}</DialogDescription>
              </DialogHeader>
              <div className="mx-auto max-w-[50rem] rounded-lg border border-border bg-surface-muted p-3 sm:p-6">
                <InvoicePreview invoice={sampleRenderableInvoice(previewTemplate.id)} />
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setPreviewId(null)}>
                  Close
                </Button>
                <Button asChild onClick={() => setSelected(previewTemplate.id)}>
                  <Link href={`/invoices/create?templateId=${previewTemplate.id}`}>
                    Use this template <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
