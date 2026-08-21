import {
  formatInvoiceDate,
  formatInvoiceMoney,
  invoiceAddressLines,
  type RenderableInvoice,
} from "@/lib/invoicing/renderable";
import {
  getInvoiceTemplate,
  type InvoiceTemplateDefinition,
} from "@/lib/invoicing/templates";

export function InvoicePreview({ invoice }: { invoice: RenderableInvoice }) {
  const template = getInvoiceTemplate(invoice.templateId);
  const cards = ["creative", "fresh", "tech", "pastel", "professional", "startup"].includes(
    template.design
  );
  const heavyBorders = ["classic", "bold", "accounting"].includes(template.design);

  return (
    <article
      className="overflow-hidden shadow-2xl"
      style={{
        backgroundColor: template.page,
        color: template.ink,
        borderColor: template.border,
        borderRadius: template.rounded ? 18 : 2,
        borderWidth: heavyBorders ? 2 : 1,
        borderStyle: "solid",
        fontFamily:
          template.font === "serif"
            ? "Georgia, 'Times New Roman', serif"
            : template.font === "mono"
              ? "ui-monospace, SFMono-Regular, Menlo, monospace"
              : "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <PreviewHeader invoice={invoice} template={template} />

      <div className="space-y-6 p-7">
        <section
          className={`grid grid-cols-2 gap-5 text-xs ${cards ? "" : "gap-8"}`}
        >
          <PreviewParty
            label="From"
            name={invoice.sender.company || invoice.sender.displayName}
            email={invoice.sender.email}
            lines={invoiceAddressLines(invoice.sender.address)}
            template={template}
            card={cards}
          />
          <PreviewParty
            label="Bill to"
            name={invoice.client.company || invoice.client.name}
            email={invoice.client.email}
            lines={invoiceAddressLines(invoice.client.address)}
            template={template}
            card={cards}
          />
        </section>

        <section
          className="grid grid-cols-3 overflow-hidden text-xs"
          style={{
            backgroundColor: template.surface,
            border: `1px solid ${template.border}`,
            borderRadius: template.rounded ? 10 : 0,
          }}
        >
          <PreviewMetric label="Issue date" value={formatInvoiceDate(invoice.issueDate)} template={template} />
          <PreviewMetric label="Due date" value={formatInvoiceDate(invoice.dueDate)} template={template} />
          <PreviewMetric label="Terms" value={invoice.paymentTerms} template={template} />
        </section>

        <section
          className="overflow-hidden"
          style={{
            border: `1px solid ${template.border}`,
            borderRadius: template.rounded ? 10 : 0,
          }}
        >
          <div
            className="grid grid-cols-[minmax(0,1fr)_4rem_6rem_7rem] gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide"
            style={{
              backgroundColor: template.tableHeaderBackground,
              color: template.tableHeaderForeground,
              borderBottom: `2px solid ${template.secondary}`,
            }}
          >
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.lineItems.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_4rem_6rem_7rem] gap-2 border-t px-4 py-3 text-xs"
              style={{
                borderColor: template.border,
                backgroundColor: index % 2 === 1 ? template.surface : template.page,
              }}
            >
              <span className="truncate">{item.description}</span>
              <span className="text-right">{item.quantity}</span>
              <span className="text-right">
                {formatInvoiceMoney(item.rate, invoice.currency)}
              </span>
              <span className="text-right font-medium">
                {formatInvoiceMoney(item.amount, invoice.currency)}
              </span>
            </div>
          ))}
        </section>

        <section
          className="ml-auto w-64 space-y-2 p-4 text-xs"
          style={{
            backgroundColor: template.totalBackground,
            color: template.totalForeground,
            borderRadius: template.rounded ? 10 : 0,
            border: template.design === "minimalist" ? `1px solid ${template.border}` : undefined,
          }}
        >
          <PreviewTotal label="Subtotal" value={formatInvoiceMoney(invoice.totals.subtotal, invoice.currency)} />
          {Number(invoice.totals.discountAmount) > 0 ? (
            <PreviewTotal
              label="Discount"
              value={`-${formatInvoiceMoney(invoice.totals.discountAmount, invoice.currency)}`}
            />
          ) : null}
          {Number(invoice.totals.taxAmount) > 0 ? (
            <PreviewTotal
              label={`Tax (${invoice.totals.taxRate}%)`}
              value={formatInvoiceMoney(invoice.totals.taxAmount, invoice.currency)}
            />
          ) : null}
          <div
            className="flex justify-between border-t-2 pt-3 text-base font-bold"
            style={{ borderColor: template.secondary }}
          >
            <span>Total</span>
            <span>{formatInvoiceMoney(invoice.totals.total, invoice.currency)}</span>
          </div>
        </section>

        {(invoice.notes || invoice.paymentTerms) && (
          <section
            className="p-4 text-xs"
            style={{
              backgroundColor: template.surface,
              borderLeft: `4px solid ${template.secondary}`,
              borderRadius: template.rounded ? 8 : 0,
            }}
          >
            {invoice.notes ? <p className="mb-2 whitespace-pre-wrap">{invoice.notes}</p> : null}
            <p style={{ color: template.muted }}>{invoice.paymentTerms}</p>
          </section>
        )}
      </div>
    </article>
  );
}

function PreviewHeader({
  invoice,
  template,
}: {
  invoice: RenderableInvoice;
  template: InvoiceTemplateDefinition;
}) {
  const company = invoice.sender.company || invoice.sender.displayName;
  const base = "relative overflow-hidden";

  if (template.design === "minimalist") {
    return (
      <header className="flex items-end justify-between border-b p-7" style={{ borderColor: template.border }}>
        <div>
          <h2 className="text-4xl font-extralight tracking-tight">Invoice</h2>
          <p className="mt-4 text-sm font-medium">{company}</p>
        </div>
        <p className="text-sm uppercase tracking-[0.25em]" style={{ color: template.muted }}>
          #{invoice.formattedNumber}
        </p>
      </header>
    );
  }

  if (template.design === "corporate") {
    return (
      <header className={`${base} grid grid-cols-[1fr_auto] bg-slate-950 text-white`}>
        <div className="p-7">
          <p className="text-xl font-bold">{company}</p>
          <p className="mt-2 text-xs text-slate-400">{invoice.sender.email}</p>
        </div>
        <div className="flex min-w-52 flex-col justify-center bg-slate-800 p-7 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Invoice</p>
          <p className="mt-2 text-lg font-bold">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "creative") {
    return (
      <header className={`${base} flex items-start justify-between bg-gradient-to-br from-orange-600 to-orange-400 p-8 text-white`}>
        <span className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <span className="absolute bottom-2 left-28 h-12 w-28 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-xl font-bold">{company}</p>
          <p className="mt-2 text-xs text-white/85">{invoice.sender.email}</p>
        </div>
        <div className="-rotate-3 rounded-xl bg-white px-6 py-4 text-center text-orange-600 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-wider">Invoice</p>
          <p className="mt-1 text-lg font-black">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "elegant") {
    return (
      <header className="relative p-8 text-center">
        <div className="flex items-center justify-center gap-4 text-purple-300">
          <span className="h-px flex-1 bg-purple-200" />
          <span className="text-3xl text-purple-600">❦</span>
          <span className="h-px flex-1 bg-purple-200" />
        </div>
        <p className="mt-3 text-2xl text-purple-700">{company}</p>
        <div className="mx-auto mt-5 max-w-sm rounded-xl bg-purple-100 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-purple-700">Invoice</p>
          <p className="mt-1 text-lg text-purple-700">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "fresh") {
    return (
      <header className={`${base} flex items-center justify-between bg-green-50 p-8`}>
        <span className="absolute left-12 top-3 text-5xl text-green-600/10">❧</span>
        <span className="absolute bottom-0 right-36 text-4xl text-green-600/10">❧</span>
        <div className="relative">
          <p className="text-3xl font-light text-green-600">{company}</p>
          <p className="mt-2 text-xs italic text-green-700">Growing business, naturally.</p>
        </div>
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-green-600 bg-white text-center">
          <p className="text-[10px] uppercase text-green-700">Invoice</p>
          <p className="mt-1 text-xs font-bold text-green-950">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "classic") {
    return (
      <header className="m-7 flex items-start justify-between border-y-4 border-double border-slate-800 py-6">
        <div>
          <p className="text-2xl uppercase tracking-wider">{company}</p>
          <p className="mt-2 text-xs text-slate-500">{invoice.sender.email}</p>
        </div>
        <div className="border-2 border-slate-800 px-6 py-4 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">Invoice</p>
          <p className="mt-1 text-xs text-slate-600">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "tech") {
    return (
      <header className={`${base} bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 p-8 text-white`}>
        <span className="absolute right-16 top-5 h-16 w-16 rounded border border-white/20" />
        <span className="absolute bottom-4 left-40 h-8 w-16 rounded border border-white/20" />
        <div className="relative flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white font-bold text-indigo-600">
                {company.charAt(0)}
              </span>
              <span className="font-semibold">{company}</span>
            </div>
            <h2 className="mt-5 text-3xl font-black">INVOICE</h2>
          </div>
          <div className="rounded-xl bg-white px-5 py-4 text-indigo-600 shadow-xl">
            <p className="text-[10px] uppercase tracking-wider">Document ID</p>
            <p className="mt-1 font-mono text-sm font-bold">{invoice.formattedNumber}</p>
          </div>
        </div>
      </header>
    );
  }

  if (template.design === "bold") {
    return (
      <header className="grid grid-cols-[1fr_38%] border-b-[8px] border-amber-400 bg-black">
        <div className="p-8 text-amber-400">
          <p className="text-2xl font-black uppercase tracking-tight">{company}</p>
          <p className="mt-3 text-xs font-normal text-white/75">{invoice.sender.email}</p>
        </div>
        <div className="flex flex-col items-center justify-center bg-amber-400 p-6 text-black">
          <p className="font-black uppercase tracking-[0.2em]">Invoice</p>
          <p className="mt-1 text-2xl font-black">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "pastel") {
    return (
      <header className={`${base} m-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 text-center`}>
        <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-indigo-200/50" />
        <span className="absolute -bottom-8 left-12 h-20 w-20 rounded-full bg-pink-200/40" />
        <p className="relative text-3xl font-light text-indigo-800">{company}</p>
        <div className="relative mx-auto mt-5 inline-block rounded-full bg-white px-8 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-500">Invoice</p>
          <p className="mt-1 font-semibold text-indigo-800">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "professional") {
    return (
      <header className="m-7 flex items-start justify-between border-b-2 border-teal-600 pb-6">
        <div>
          <p className="font-serif text-2xl text-teal-600">{company}</p>
          <p className="mt-2 text-xs text-teal-700">{invoice.sender.email}</p>
        </div>
        <div className="border-2 border-teal-600 bg-teal-50 px-7 py-4 text-center">
          <p className="font-semibold uppercase tracking-wider text-teal-600">Invoice</p>
          <p className="mt-1 text-xs font-bold text-teal-950">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "luxury") {
    return (
      <header className="m-6 border-4 border-double border-amber-700 bg-amber-50 p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-400 text-xl font-bold text-amber-50">
          {company.charAt(0)}
        </div>
        <p className="mt-4 text-2xl uppercase tracking-[0.2em] text-amber-700">{company}</p>
        <div className="my-4 flex items-center gap-3 text-amber-500">
          <span className="h-px flex-1 bg-amber-300" /><span>◆</span><span className="h-px flex-1 bg-amber-300" />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Invoice</p>
        <p className="mt-1 text-xs italic text-amber-900">{invoice.formattedNumber}</p>
      </header>
    );
  }

  if (template.design === "startup") {
    return (
      <header className={`${base} flex min-h-44 items-start justify-between bg-gradient-to-br from-pink-700 via-pink-500 to-pink-300 p-8 text-white`}>
        <span className="absolute -bottom-10 left-12 h-24 w-36 rounded-[60%] bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-xl">↗</span>
            <p className="text-2xl font-bold">{company}</p>
          </div>
          <p className="mt-3 text-xs text-white/85">Building what comes next.</p>
        </div>
        <div className="relative rounded-xl bg-white px-6 py-4 text-center text-pink-700 shadow-xl">
          <p className="text-[10px] uppercase tracking-wider">Invoice</p>
          <p className="mt-1 text-base font-bold">{invoice.formattedNumber}</p>
        </div>
      </header>
    );
  }

  if (template.design === "accounting") {
    return (
      <header>
        <div className="grid grid-cols-[1fr_auto] items-center bg-blue-950 p-7 text-white">
          <div>
            <p className="font-serif text-2xl">{company}</p>
            <p className="mt-1 text-xs italic text-blue-100">Accounting & financial services</p>
          </div>
          <div className="border-4 border-double border-blue-200 bg-white px-6 py-4 text-center text-blue-950">
            <p className="text-xs uppercase tracking-widest">Invoice</p>
            <p className="mt-1 font-bold">{invoice.formattedNumber}</p>
          </div>
        </div>
        <div className="h-5 bg-blue-100" />
      </header>
    );
  }

  return (
    <header className="grid grid-cols-[1fr_auto] items-start border-b bg-gray-50 p-7">
      <div>
        <p className="text-2xl font-light text-gray-800">{company}</p>
        <p className="mt-1 text-xs italic text-gray-500">Independent advisory services</p>
        <p className="mt-3 text-xs text-gray-600">{invoice.sender.email}</p>
      </div>
      <div className="min-w-48 bg-gray-800 px-8 py-5 text-center text-white">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300">Invoice</p>
        <p className="mt-2 text-base">{invoice.formattedNumber}</p>
      </div>
    </header>
  );
}

function PreviewMetric({
  label,
  value,
  template,
}: {
  label: string;
  value: string;
  template: InvoiceTemplateDefinition;
}) {
  return (
    <div className="border-r p-3 text-center last:border-r-0" style={{ borderColor: template.border }}>
      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: template.muted }}>
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function PreviewParty({
  label,
  name,
  email,
  lines,
  template,
  card,
}: {
  label: string;
  name: string;
  email: string;
  lines: string[];
  template: InvoiceTemplateDefinition;
  card: boolean;
}) {
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: card ? template.surface : undefined,
        border: card ? `1px solid ${template.border}` : undefined,
        borderLeft: `4px solid ${template.secondary}`,
        borderRadius: card && template.rounded ? 10 : 0,
      }}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: template.primary }}>
        {label}
      </p>
      <p className="font-bold">{name}</p>
      <p style={{ color: template.muted }}>{email}</p>
      {lines.map((line) => (
        <p key={line} style={{ color: template.muted }}>
          {line}
        </p>
      ))}
    </div>
  );
}

function PreviewTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </div>
  );
}
