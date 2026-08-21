import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  type RenderableInvoice,
} from "@/lib/invoicing/renderable";
import type {
  InvoiceAddress,
  InvoiceClientSnapshot,
  InvoiceSenderSnapshot,
} from "@/types/invoicing";

export const INVOICE_HTML_TEMPLATE_IDS = [
  "modern-blue",
  "minimalist-gray",
  "corporate-dark",
  "creative-orange",
  "elegant-purple",
  "fresh-green",
  "classic-navy",
  "tech-gradient",
  "bold-black-yellow",
  "soft-pastel",
  "professional-teal",
  "luxury-gold",
  "startup-pink",
  "accounting-blue",
  "consulting-gray",
] as const;

export type InvoiceHtmlTemplateId = (typeof INVOICE_HTML_TEMPLATE_IDS)[number];

interface LegacyAddress {
  street: string;
  street2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface LegacyTemplateParty {
  company: string;
  displayName: string;
  email: string;
  phone: string;
  address: LegacyAddress;
  timezone: "UTC";
}

export interface InvoiceHtmlTemplateData {
  invoice: {
    invoiceNumber: string;
    formattedInvoiceNumber: string;
    date: string;
    dueDate: string;
    currency: string;
    lineItems: RenderableInvoice["lineItems"];
    subtotal: string;
    discountType: RenderableInvoice["totals"]["discountType"];
    discountValue: string;
    discountAmount: string;
    discountLabel: string;
    taxableAmount: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    notes: string;
    paymentTerms: string;
    paymentUrl: string;
  };
  userData: LegacyTemplateParty;
  profileData: LegacyTemplateParty;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address: LegacyAddress;
  };
  timezone: "UTC";
  invoicePrefix: string;
  currentDate: number;
  senderDisplayName: string;
  senderDisplayNameInitial: string;
  senderEmail: string;
  senderPhone: string;
  senderAddress: LegacyAddress;
  senderAddressStreet: string;
  senderAddressCityStateZip: string;
  senderAddressCountry: string;
  customerAddressStreet: string;
  customerAddressCityStateZip: string;
  customerAddressCountry: string;
}

type HelperOptions = {
  hash?: Record<string, unknown>;
};

const DEFAULT_TEMPLATE_ID: InvoiceHtmlTemplateId = "modern-blue";
const TEMPLATE_ID_SET = new Set<string>(INVOICE_HTML_TEMPLATE_IDS);
const TEMPLATE_DIRECTORY = path.join(
  process.cwd(),
  "src",
  "lib",
  "invoicing",
  "html-templates"
);
const TAX_MARKER = "{{#if invoice.taxRate}}";
const ONE_PAGE_STYLES = `<style id="invoice-one-page-styles">
  .running-header { display: none !important; }
  #invoice-print-root { width: 100%; transform-origin: top left; }
  #invoice-print-root,
  #invoice-print-root * {
    break-before: auto !important;
    break-after: auto !important;
    break-inside: auto !important;
    page-break-before: auto !important;
    page-break-after: auto !important;
    page-break-inside: auto !important;
  }
</style>`;

const handlebars = Handlebars.create();
const compiledTemplates = new Map<
  InvoiceHtmlTemplateId,
  ReturnType<typeof handlebars.compile>
>();
let commonTemplateParts:
  | {
      styles: string;
      runningHeader: ReturnType<typeof handlebars.compile> | null;
    }
  | undefined;

handlebars.registerHelper(
  "formatCurrency",
  (amount: unknown, options: HelperOptions) => {
    const currency =
      typeof options?.hash?.currency === "string"
        ? options.hash.currency
        : "USD";
    return formatInvoiceMoney(String(amount ?? ""), currency);
  }
);
handlebars.registerHelper("formatDate", (date: unknown) =>
  formatInvoiceDate(String(date ?? ""))
);
handlebars.registerHelper("formatDateShort", (date: unknown) =>
  formatInvoiceDate(String(date ?? ""))
);
handlebars.registerHelper("eq", (left: unknown, right: unknown) => left === right);
handlebars.registerHelper(
  "formatInvoiceNumber",
  (number: unknown, prefix: unknown) => {
    const value = String(number ?? "");
    return prefix ? `${String(prefix)}-${value.padStart(5, "0")}` : value;
  }
);
handlebars.registerHelper("nl2br", (text: unknown) => {
  if (!text) return "";
  const escaped = handlebars.Utils.escapeExpression(String(text));
  return new handlebars.SafeString(escaped.replace(/\r?\n/g, "<br>"));
});

function toLegacyAddress(address: InvoiceAddress): LegacyAddress {
  return {
    street: address.street,
    street2: address.street2 ?? "",
    city: address.city,
    state: address.subdivision ?? "",
    zipCode: address.postalCode,
    country: address.country,
  };
}

function streetLine(address: InvoiceAddress): string {
  return [address.street, address.street2]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}

function cityStateZipLine(address: InvoiceAddress): string {
  const cityAndState = [address.city, address.subdivision]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
  return [cityAndState, address.postalCode]
    .filter((part) => Boolean(part?.trim()))
    .join(" ");
}

function senderParty(sender: InvoiceSenderSnapshot): LegacyTemplateParty {
  return {
    company: sender.company,
    displayName: sender.displayName,
    email: sender.email,
    phone: sender.phone ?? "",
    address: toLegacyAddress(sender.address),
    timezone: "UTC",
  };
}

function customerParty(client: InvoiceClientSnapshot) {
  return {
    name: client.name,
    company: client.company ?? "",
    email: client.email,
    phone: client.phone ?? "",
    address: toLegacyAddress(client.address),
  };
}

function safePaymentUrl(value?: string): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function hasDiscount(invoice: RenderableInvoice): boolean {
  const amount = Number(invoice.totals.discountAmount);
  return (
    invoice.totals.discountType !== "none" &&
    Number.isFinite(amount) &&
    amount > 0
  );
}

function discountLabel(invoice: RenderableInvoice): string {
  if (invoice.totals.discountType === "percent") {
    return `Discount (${invoice.totals.discountValue}%)`;
  }
  return "Discount";
}

function invoicePrefix(formattedNumber: string): string {
  const separator = formattedNumber.search(/[-_\d]/);
  if (separator < 1) return "INV";
  return formattedNumber.slice(0, separator);
}

export function adaptRenderableInvoiceToHtmlTemplate(
  invoice: RenderableInvoice,
  paymentUrl?: string
): InvoiceHtmlTemplateData {
  const sender = senderParty(invoice.sender);
  const customer = customerParty(invoice.client);
  const senderDisplayName =
    invoice.sender.displayName || invoice.sender.company || "";
  const includeDiscount = hasDiscount(invoice);

  return {
    invoice: {
      invoiceNumber: invoice.formattedNumber,
      formattedInvoiceNumber: invoice.formattedNumber,
      date: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency.toUpperCase(),
      lineItems: invoice.lineItems,
      subtotal: invoice.totals.subtotal,
      discountType: invoice.totals.discountType,
      discountValue: invoice.totals.discountValue,
      discountAmount: includeDiscount ? invoice.totals.discountAmount : "",
      discountLabel: includeDiscount ? discountLabel(invoice) : "",
      taxableAmount: invoice.totals.taxableAmount,
      taxRate:
        Number(invoice.totals.taxRate) > 0 ? invoice.totals.taxRate : "",
      taxAmount: invoice.totals.taxAmount,
      total: invoice.totals.total,
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      paymentUrl: safePaymentUrl(paymentUrl),
    },
    userData: sender,
    profileData: sender,
    customer,
    timezone: "UTC",
    invoicePrefix: invoicePrefix(invoice.formattedNumber),
    currentDate: Date.now(),
    senderDisplayName,
    senderDisplayNameInitial: senderDisplayName.charAt(0).toUpperCase(),
    senderEmail: invoice.sender.email,
    senderPhone: invoice.sender.phone ?? "",
    senderAddress: sender.address,
    senderAddressStreet: streetLine(invoice.sender.address),
    senderAddressCityStateZip: cityStateZipLine(invoice.sender.address),
    senderAddressCountry: invoice.sender.address.country,
    customerAddressStreet: streetLine(invoice.client.address),
    customerAddressCityStateZip: cityStateZipLine(invoice.client.address),
    customerAddressCountry: invoice.client.address.country,
  };
}

function isInvoiceHtmlTemplateId(value: string): value is InvoiceHtmlTemplateId {
  return TEMPLATE_ID_SET.has(value);
}

function discountRow(templateId: InvoiceHtmlTemplateId): string {
  if (templateId === "accounting-blue" || templateId === "classic-navy") {
    return `{{#if invoice.discountAmount}}
            <tr class="discount-row">
              <td class="label">{{invoice.discountLabel}}:</td>
              <td class="value">-{{formatCurrency invoice.discountAmount currency=invoice.currency}}</td>
            </tr>
            {{/if}}`;
  }

  if (templateId === "consulting-gray") {
    return `{{#if invoice.discountAmount}}
          <div class="summary-row discount-row">
            <span class="summary-label">{{invoice.discountLabel}}</span>
            <span class="summary-value">-{{formatCurrency invoice.discountAmount currency=invoice.currency}}</span>
          </div>
          {{/if}}`;
  }

  if (templateId === "professional-teal") {
    return `{{#if invoice.discountAmount}}
        <div class="row discount-row">
          <span>{{invoice.discountLabel}}</span>
          <span>-{{formatCurrency invoice.discountAmount currency=invoice.currency}}</span>
        </div>
        {{/if}}`;
  }

  if (
    templateId === "modern-blue" ||
    templateId === "minimalist-gray" ||
    templateId === "corporate-dark" ||
    templateId === "elegant-purple"
  ) {
    return `{{#if invoice.discountAmount}}
          <div class="total-row discount-row">
            <div class="total-label">{{invoice.discountLabel}}</div>
            <div class="total-value">-{{formatCurrency invoice.discountAmount currency=invoice.currency}}</div>
          </div>
          {{/if}}`;
  }

  return `{{#if invoice.discountAmount}}
          <div class="total-row discount-row">
            <span>{{invoice.discountLabel}}</span>
            <span>-{{formatCurrency invoice.discountAmount currency=invoice.currency}}</span>
          </div>
          {{/if}}`;
}

const PAYMENT_ACTION = `{{#if invoice.paymentUrl}}
    <div class="invoice-payment-action" style="margin: 20px auto 0; max-width: 420px; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <a href="{{invoice.paymentUrl}}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; border-radius: 6px; background: #111827; color: #ffffff; font-family: Arial, sans-serif; font-size: 10pt; font-weight: 600; text-decoration: none;">Pay invoice online</a>
    </div>
    {{/if}}
`;

function addNativeExtensions(
  source: string,
  templateId: InvoiceHtmlTemplateId
): string {
  const taxMarkerIndex = source.lastIndexOf(TAX_MARKER);
  if (taxMarkerIndex < 0) {
    throw new Error(
      `Invoice HTML template "${templateId}" has no totals tax marker`
    );
  }

  let extended =
    source.slice(0, taxMarkerIndex) +
    discountRow(templateId) +
    "\n" +
    source.slice(taxMarkerIndex);

  const bodyCloseIndex = extended.lastIndexOf("</body>");
  const containerCloseIndex = extended.lastIndexOf("</div>", bodyCloseIndex);
  if (bodyCloseIndex < 0 || containerCloseIndex < 0) {
    throw new Error(
      `Invoice HTML template "${templateId}" has no closing body container`
    );
  }

  extended =
    extended.slice(0, containerCloseIndex) +
    PAYMENT_ACTION +
    extended.slice(containerCloseIndex);
  return extended;
}

function getCompiledTemplate(templateId: InvoiceHtmlTemplateId) {
  const cached = compiledTemplates.get(templateId);
  if (cached) return cached;

  const source = readFileSync(
    path.join(TEMPLATE_DIRECTORY, `${templateId}.html`),
    "utf8"
  );
  const compiled = handlebars.compile(addNativeExtensions(source, templateId), {
    noEscape: false,
    strict: false,
  });
  compiledTemplates.set(templateId, compiled);
  return compiled;
}

function getCommonTemplateParts() {
  if (commonTemplateParts) return commonTemplateParts;

  const commonSource = readFileSync(
    path.join(TEMPLATE_DIRECTORY, "common.html"),
    "utf8"
  );
  const styles =
    commonSource.match(
      /<style[^>]*id="common-styles"[^>]*>[\s\S]*?<\/style>/
    )?.[0] ?? "";
  const runningHeaderSource =
    commonSource.match(
      /<!-- RUNNING_HEADER_START -->([\s\S]*?)<!-- RUNNING_HEADER_END -->/
    )?.[1] ?? "";

  commonTemplateParts = {
    styles,
    runningHeader: runningHeaderSource
      ? handlebars.compile(runningHeaderSource, {
          noEscape: false,
          strict: false,
        })
      : null,
  };
  return commonTemplateParts;
}

export function compileInvoiceHtml(
  invoice: RenderableInvoice,
  paymentUrl?: string
): string {
  const templateId = isInvoiceHtmlTemplateId(invoice.templateId)
    ? invoice.templateId
    : DEFAULT_TEMPLATE_ID;
  const data = adaptRenderableInvoiceToHtmlTemplate(invoice, paymentUrl);
  const template = getCompiledTemplate(templateId);
  const runtimeOptions = {
    allowProtoMethodsByDefault: false,
    allowProtoPropertiesByDefault: false,
  };

  let html = template(data, runtimeOptions);
  const common = getCommonTemplateParts();

  if (common.styles) {
    html = html.replace(
      "</head>",
      `${common.styles}\n${ONE_PAGE_STYLES}\n</head>`
    );
  }
  if (common.runningHeader && html.includes("<body>")) {
    const runningHeader = common.runningHeader(data, runtimeOptions);
    html = html.replace("<body>", `<body>\n${runningHeader}\n`);
  }
  if (html.includes("<body>") && html.includes("</body>")) {
    html = html.replace(
      "<body>",
      '<body>\n<div id="invoice-print-root" style="width: 100%; transform-origin: top left;">'
    );
    html = html.replace("</body>", "</div>\n</body>");
  }

  return html;
}
