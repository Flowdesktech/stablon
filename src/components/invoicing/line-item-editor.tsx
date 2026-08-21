"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInvoiceMoney } from "@/components/invoicing/invoice-ui";

export interface EditableLineItem {
  id?: string;
  description: string;
  quantity: string;
  rate: string;
}

export function LineItemEditor({
  items,
  currency,
  onChange,
}: {
  items: EditableLineItem[];
  currency: string;
  onChange: (items: EditableLineItem[]) => void;
}) {
  function update(index: number, patch: Partial<EditableLineItem>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function add() {
    onChange([...items, { description: "", quantity: "1", rate: "0" }]);
  }

  function remove(index: number) {
    if (items.length === 1) {
      onChange([{ description: "", quantity: "1", rate: "0" }]);
      return;
    }
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_8rem_2.5rem] gap-3 px-1 text-xs font-medium text-muted-foreground md:grid">
        <span>Description</span>
        <span>Quantity</span>
        <span>Rate</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      {items.map((item, index) => {
        const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        return (
          <div
            key={item.id || index}
            className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-[minmax(0,1fr)_7rem_8rem_8rem_2.5rem] md:items-center md:border-0 md:bg-transparent md:p-0"
          >
            <Input
              required
              value={item.description}
              onChange={(event) => update(index, { description: event.target.value })}
              placeholder="Service or product"
              aria-label={`Line ${index + 1} description`}
            />
            <div>
              <span className="mb-1 block text-xs text-muted-foreground md:hidden">Quantity</span>
              <Input
                required
                min="0.000001"
                step="any"
                type="number"
                inputMode="decimal"
                value={item.quantity}
                onChange={(event) => update(index, { quantity: event.target.value })}
                aria-label={`Line ${index + 1} quantity`}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground md:hidden">Rate</span>
              <Input
                required
                min="0"
                step="any"
                type="number"
                inputMode="decimal"
                value={item.rate}
                onChange={(event) => update(index, { rate: event.target.value })}
                aria-label={`Line ${index + 1} rate`}
              />
            </div>
            <div className="text-right text-sm font-medium tabular-nums text-foreground">
              <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">Amount</span>
              {formatInvoiceMoney(amount, currency)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label={`Remove line ${index + 1}`}
              className="text-muted-foreground hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> Add line item
      </Button>
    </div>
  );
}
