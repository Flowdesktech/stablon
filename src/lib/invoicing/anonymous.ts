import { randomUUID } from "crypto";
import { z } from "zod";
import { calculateInvoiceTotals } from "@/lib/invoicing/money";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";

const decimalString = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^\d{1,15}(?:\.\d{1,6})?$/, "Enter a valid positive number");

const quantityString = decimalString.refine(
  (value) => Number(value) > 0,
  "Quantity must be greater than zero"
);

const percentString = decimalString.refine(
  (value) => Number(value) <= 100,
  "Percentage cannot exceed 100"
);

const addressSchema = z
  .object({
    street: z.string().trim().max(160).default(""),
    street2: z.string().trim().max(160).optional(),
    city: z.string().trim().max(100).default(""),
    subdivision: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(30).default(""),
    country: z.string().trim().min(2).max(80).default(""),
  })
  .strict();

const partySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    company: z.string().trim().max(160).optional(),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    address: addressSchema,
  })
  .strict();

export const anonymousInvoiceSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1).max(40).default("INV-00001"),
    issueDate: z.string().date(),
    dueDate: z.string().date(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase()),
    sender: partySchema,
    client: partySchema,
    lineItems: z
      .array(
        z
          .object({
            description: z.string().trim().min(1).max(500),
            quantity: quantityString,
            rate: decimalString,
          })
          .strict()
      )
      .min(1)
      .max(25),
    taxRate: percentString.default("0"),
    discountType: z.enum(["none", "percent", "fixed"]).default("none"),
    discountValue: decimalString.default("0"),
    notes: z.string().trim().max(3000).default(""),
    paymentTerms: z.string().trim().max(160).default("Due on receipt"),
    templateId: z
      .string()
      .trim()
      .refine(
        (value) => INVOICE_TEMPLATES.some((template) => template.id === value),
        "Unknown invoice template"
      )
      .default("modern-blue"),
  })
  .strict()
  .refine((value) => value.dueDate >= value.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
  })
  .refine(
    (value) =>
      value.discountType !== "percent" || Number(value.discountValue) <= 100,
    {
      message: "Discount percentage cannot exceed 100",
      path: ["discountValue"],
    }
  );

export type AnonymousInvoiceInput = z.infer<typeof anonymousInvoiceSchema>;

export function anonymousInvoiceToRenderable(
  input: AnonymousInvoiceInput
): RenderableInvoice {
  const computed = calculateInvoiceTotals(
    input.lineItems.map((item) => ({ ...item, id: randomUUID() })),
    input.currency,
    input.taxRate,
    input.discountType,
    input.discountValue
  );

  return {
    formattedNumber: input.invoiceNumber,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    lineItems: computed.lineItems,
    totals: computed.totals,
    notes: input.notes,
    paymentTerms: input.paymentTerms,
    templateId: input.templateId,
    sender: {
      profileId: "anonymous",
      displayName: input.sender.name,
      company: input.sender.company || input.sender.name,
      email: input.sender.email,
      phone: input.sender.phone,
      address: input.sender.address,
    },
    client: {
      clientId: "anonymous",
      name: input.client.name,
      company: input.client.company,
      email: input.client.email,
      phone: input.client.phone,
      address: input.client.address,
    },
  };
}
