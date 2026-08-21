import { z } from "zod";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";

const shortText = z.string().trim().max(256);
const amountText = z.string().trim().min(1).max(40);

const addressSchema = z
  .object({
    street: z.string().trim().max(160),
    street2: z.string().trim().max(160).optional(),
    city: z.string().trim().max(100),
    subdivision: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(30),
    country: z.string().trim().max(100),
  })
  .strict();

const senderSchema = z
  .object({
    profileId: shortText,
    displayName: z.string().trim().max(160),
    company: z.string().trim().max(160),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    address: addressSchema,
    logoUrl: z.string().trim().url().max(2048).optional(),
  })
  .strict();

const clientSchema = z
  .object({
    clientId: shortText,
    name: z.string().trim().max(160),
    company: z.string().trim().max(160).optional(),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    address: addressSchema,
  })
  .strict();

const totalsSchema = z
  .object({
    subtotal: amountText,
    discountType: z.enum(["none", "percent", "fixed"]),
    discountValue: amountText,
    discountAmount: amountText,
    taxableAmount: amountText,
    taxRate: amountText,
    taxAmount: amountText,
    total: amountText,
  })
  .strict();

export const invoicePreviewRequestSchema = z
  .object({
    invoice: z
      .object({
        formattedNumber: z.string().trim().min(1).max(80),
        issueDate: z.string().date(),
        dueDate: z.string().date(),
        currency: z.string().trim().min(3).max(20),
        lineItems: z
          .array(
            z
              .object({
                id: shortText,
                description: z.string().trim().min(1).max(500),
                quantity: amountText,
                rate: amountText,
                amount: amountText,
              })
              .strict()
          )
          .min(1)
          .max(100),
        totals: totalsSchema,
        notes: z.string().trim().max(5000),
        paymentTerms: z.string().trim().max(160),
        templateId: z
          .string()
          .trim()
          .refine(
            (value) => INVOICE_TEMPLATES.some((template) => template.id === value),
            "Unknown invoice template"
          ),
        sender: senderSchema,
        client: clientSchema,
      })
      .strict(),
    paymentUrl: z.string().trim().url().max(2048).optional(),
  })
  .strict();
