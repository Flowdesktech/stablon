import { z } from "zod";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";

const countryCode = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const templateIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) => INVOICE_TEMPLATES.some((template) => template.id === value),
    "Unknown invoice template"
  );

export const invoiceAddressSchema = z.object({
  street: z.string().trim().max(160).default(""),
  street2: z.string().trim().max(160).optional(),
  city: z.string().trim().max(100).default(""),
  subdivision: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(30).default(""),
  country: countryCode.default("USA"),
});

export const invoiceSettingsSchema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase()),
  nextNumber: z.coerce.number().int().positive().default(1),
  taxRate: z.string().trim().default("0"),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  paymentTerms: z.string().trim().max(160).default("Due on receipt"),
  dueDateDuration: z.coerce.number().int().min(0).max(365).default(7),
  autoIncrementNumber: z.boolean().default(true),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  templateId: templateIdSchema.default("modern-blue"),
});

export const settlementSchema = z.object({
  enabled: z.boolean().default(false),
  destinationType: z.enum(["bridge_wallet", "address"]).default("address"),
  bridgeWalletId: z.string().trim().max(200).optional(),
  address: z.string().trim().max(256).optional(),
  paymentRail: z.string().trim().max(50).default("ethereum"),
  currency: z.string().trim().max(20).default("usdc"),
  developerFeePercent: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d+)?$/, "Processing fee must be a valid percentage")
    .refine((value) => Number(value) <= 10, "Processing fee cannot exceed 10%")
    .optional(),
  acceptedFiatRails: z.array(z.string().trim().max(50)).max(10).default([]),
  acceptedCryptoRails: z.array(z.string().trim().max(50)).max(20).default([]),
});

export const invoiceProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  address: invoiceAddressSchema,
  logoUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
  settings: invoiceSettingsSchema,
  settlement: settlementSchema,
});

export const invoiceClientInputSchema = z.object({
  profileId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  address: invoiceAddressSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const invoiceLineItemInputSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.string().trim().min(1).max(40),
  rate: z.string().trim().min(1).max(40),
});

export const invoiceInputSchema = z.object({
  profileId: z.string().trim().min(1).max(128),
  clientId: z.string().trim().min(1).max(128),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  lineItems: z.array(invoiceLineItemInputSchema).min(1).max(100),
  taxRate: z.string().trim().max(40).default("0"),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.string().trim().max(40).default("0"),
  notes: z.string().trim().max(5000).default(""),
  paymentTerms: z.string().trim().max(160).default("Due on receipt"),
  templateId: templateIdSchema.default("modern-blue"),
}).refine((value) => value.dueDate >= value.issueDate, {
  message: "Due date cannot be before issue date",
  path: ["dueDate"],
});

export const recurringInvoiceInputSchema = z.object({
  profileId: z.string().trim().min(1).max(128),
  clientId: z.string().trim().min(1).max(128),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  autoSend: z.boolean().default(false),
  dueDateDuration: z.coerce.number().int().min(0).max(365).default(7),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  lineItems: z.array(invoiceLineItemInputSchema).min(1).max(100),
  taxRate: z.string().trim().max(40).default("0"),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.string().trim().max(40).default("0"),
  notes: z.string().trim().max(5000).default(""),
  paymentTerms: z.string().trim().max(160).default("Due on receipt"),
  templateId: templateIdSchema.default("modern-blue"),
}).refine((value) => !value.endDate || value.endDate >= value.startDate, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

export const checkoutInputSchema = z.object({
  sourceRail: z.string().trim().min(1).max(50),
});

export type InvoiceProfileInput = z.infer<typeof invoiceProfileInputSchema>;
export type InvoiceClientInput = z.infer<typeof invoiceClientInputSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type RecurringInvoiceInput = z.infer<typeof recurringInvoiceInputSchema>;
