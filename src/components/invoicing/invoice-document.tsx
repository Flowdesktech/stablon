import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";
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
import type {
  InvoiceClientSnapshot,
  InvoiceSenderSnapshot,
} from "@/types/invoicing";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingHorizontal: 42,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.45,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 26,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerMinimal: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerFormal: {
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 5,
    borderBottomWidth: 1,
  },
  headerBold: {
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  headerCentered: {
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  headerBordered: {
    borderWidth: 2,
    padding: 18,
  },
  headerBadge: {
    minWidth: 150,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerOrnament: {
    fontSize: 18,
    marginBottom: 7,
  },
  businessName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    marginBottom: 3,
  },
  businessMeta: {
    fontSize: 8,
    opacity: 0.85,
  },
  invoiceTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    letterSpacing: 1.5,
    textAlign: "right",
  },
  invoiceNumber: {
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "right",
  },
  parties: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 26,
  },
  party: {
    width: "50%",
  },
  partyCard: {
    padding: 12,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  partyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 3,
  },
  muted: {
    color: "#6b7280",
  },
  dates: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginBottom: 20,
  },
  dateItem: {
    minWidth: 105,
  },
  dateCard: {
    flexGrow: 1,
    padding: 9,
    borderWidth: 1,
    textAlign: "center",
  },
  dateValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  descriptionCell: {
    width: "52%",
    paddingRight: 10,
  },
  smallCell: {
    width: "16%",
    textAlign: "right",
  },
  totalArea: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 24,
  },
  totals: {
    width: 235,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  grandTotal: {
    marginTop: 5,
    paddingTop: 9,
    borderTopWidth: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  notes: {
    padding: 14,
    backgroundColor: "#f8fafc",
    marginBottom: 14,
  },
  paymentBox: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  paymentLink: {
    marginTop: 5,
    fontFamily: "Helvetica-Bold",
    textDecoration: "none",
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#9ca3af",
    fontSize: 7,
  },
});

function senderName(sender: InvoiceSenderSnapshot): string {
  return sender.company || sender.displayName;
}

function clientName(client: InvoiceClientSnapshot): string {
  return client.company || client.name;
}

export function InvoiceParty({
  label,
  name,
  contactName,
  email,
  phone,
  address,
  template,
  card = false,
}: {
  label: string;
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  address: string[];
  template: InvoiceTemplateDefinition;
  card?: boolean;
}) {
  return (
    <View
      style={[
        styles.party,
        ...(card
          ? [
              styles.partyCard,
              {
                backgroundColor: template.surface,
                borderColor: template.border,
                borderLeftColor: template.secondary,
                borderLeftWidth: 4,
                borderRadius: template.rounded ? 7 : 0,
              },
            ]
          : []),
      ]}
    >
      <Text style={[styles.label, { color: template.primary }]}>{label}</Text>
      <Text style={styles.partyName}>{name}</Text>
      {contactName && contactName !== name ? <Text>{contactName}</Text> : null}
      <Text style={[styles.muted, { color: template.muted }]}>{email}</Text>
      {phone ? <Text style={[styles.muted, { color: template.muted }]}>{phone}</Text> : null}
      {address.map((line) => (
        <Text key={line} style={[styles.muted, { color: template.muted }]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function InvoiceHeader({
  invoice,
  template,
}: {
  invoice: RenderableInvoice;
  template: InvoiceTemplateDefinition;
}) {
  const centered = ["elegant", "pastel", "luxury"].includes(template.design);
  const split = ["corporate", "bold", "accounting", "consulting"].includes(
    template.design
  );
  const minimal = template.design === "minimalist";
  const bordered = ["classic", "professional"].includes(template.design);
  const tagline: Partial<Record<InvoiceTemplateDefinition["design"], string>> = {
    fresh: "Growing business, naturally",
    tech: "Digital services",
    startup: "Building what comes next",
    accounting: "Accounting & financial services",
    consulting: "Independent advisory services",
  };

  if (centered) {
    return (
      <View
        style={[
          styles.header,
          styles.headerCentered,
          {
            backgroundColor: template.headerBackground,
            borderColor: template.border,
            borderWidth: template.design === "luxury" ? 3 : 0,
            borderRadius: template.rounded ? 12 : 0,
          },
        ]}
      >
        <Text style={[styles.headerOrnament, { color: template.secondary }]}>
          {template.design === "luxury" ? "*  *  *" : "•  •  •"}
        </Text>
        <Text
          style={[
            styles.businessName,
            {
              color: template.headerForeground,
              fontSize: template.design === "pastel" ? 22 : 18,
              letterSpacing: template.design === "luxury" ? 2.5 : 0,
              textTransform: template.design === "luxury" ? "uppercase" : "none",
            },
          ]}
        >
          {senderName(invoice.sender)}
        </Text>
        <View
          style={[
            styles.headerBadge,
            {
              marginTop: 12,
              backgroundColor: template.surface,
              borderColor: template.border,
              borderWidth: 1,
              borderRadius: template.rounded ? 14 : 0,
            },
          ]}
        >
          <Text style={[styles.headerBadgeLabel, { color: template.primary }]}>Invoice</Text>
          <Text style={[styles.invoiceNumber, { color: template.ink, textAlign: "center" }]}>
            {invoice.formattedNumber}
          </Text>
        </View>
      </View>
    );
  }

  if (split) {
    const badgeBackground =
      template.design === "bold"
        ? template.secondary
        : template.design === "corporate"
          ? "#1f2937"
          : template.design === "consulting"
            ? "#374151"
            : "#ffffff";
    const badgeForeground =
      template.design === "bold"
        ? "#000000"
        : template.design === "corporate" || template.design === "consulting"
          ? "#ffffff"
          : template.primary;
    return (
      <View
        style={[
          styles.header,
          styles.headerBold,
          {
            backgroundColor: template.headerBackground,
            borderBottomColor: template.secondary,
            borderBottomWidth: template.design === "bold" ? 6 : 0,
          },
        ]}
      >
        <View style={{ maxWidth: "58%" }}>
          <Text
            style={[
              styles.businessName,
              {
                color: template.headerForeground,
                textTransform: template.design === "bold" ? "uppercase" : "none",
                letterSpacing: template.design === "bold" ? -0.5 : 0,
              },
            ]}
          >
            {senderName(invoice.sender)}
          </Text>
          {tagline[template.design] ? (
            <Text style={[styles.businessMeta, { color: template.headerForeground, opacity: 0.82 }]}>
              {tagline[template.design]}
            </Text>
          ) : null}
          <Text style={[styles.businessMeta, { color: template.headerForeground, opacity: 0.75 }]}>
            {invoice.sender.email}
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: badgeBackground }]}>
          <Text style={[styles.headerBadgeLabel, { color: badgeForeground }]}>Invoice</Text>
          <Text style={[styles.invoiceNumber, { color: badgeForeground, textAlign: "center" }]}>
            {invoice.formattedNumber}
          </Text>
        </View>
      </View>
    );
  }

  if (minimal || bordered) {
    return (
      <View
        style={[
          styles.header,
          minimal ? styles.headerMinimal : styles.headerFormal,
          {
            backgroundColor: template.headerBackground,
            borderTopColor: template.primary,
            borderBottomColor: template.design === "classic" ? template.primary : template.secondary,
            borderBottomWidth: template.design === "classic" ? 3 : 2,
          },
        ]}
      >
        <View style={{ maxWidth: "60%" }}>
          <Text
            style={[
              styles.businessName,
              {
                color: template.headerForeground,
                fontSize: minimal ? 12 : 17,
                letterSpacing: template.design === "classic" ? 1.5 : 0,
                textTransform: template.design === "classic" ? "uppercase" : "none",
              },
            ]}
          >
            {senderName(invoice.sender)}
          </Text>
          <Text style={[styles.businessMeta, { color: template.muted }]}>
            {invoice.sender.email}
          </Text>
        </View>
        <View
          style={[
            styles.headerBadge,
            {
              borderColor: template.primary,
              borderWidth: minimal ? 0 : 2,
              backgroundColor: template.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.headerBadgeLabel,
              { color: template.primary, letterSpacing: minimal ? 3 : 1.5 },
            ]}
          >
            Invoice
          </Text>
          <Text style={[styles.invoiceNumber, { color: template.ink, textAlign: "center" }]}>
            {invoice.formattedNumber}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.header,
        styles.headerBold,
        {
          backgroundColor: template.headerBackground,
          borderRadius: template.rounded ? 10 : 0,
        },
      ]}
    >
      <View style={{ maxWidth: "58%" }}>
        <Text style={[styles.businessName, { color: template.headerForeground }]}>
          {senderName(invoice.sender)}
        </Text>
        {tagline[template.design] ? (
          <Text style={[styles.businessMeta, { color: template.headerForeground, opacity: 0.82 }]}>
            {tagline[template.design]}
          </Text>
        ) : null}
        <Text style={[styles.businessMeta, { color: template.headerForeground, opacity: 0.8 }]}>
          {invoice.sender.email}
        </Text>
        {invoice.sender.phone ? (
          <Text style={[styles.businessMeta, { color: template.headerForeground, opacity: 0.8 }]}>
            {invoice.sender.phone}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.headerBadge,
          {
            backgroundColor:
              template.design === "creative" ||
              template.design === "tech" ||
              template.design === "startup"
                ? "#ffffff"
                : template.surface,
            borderRadius: template.rounded ? 9 : 0,
          },
        ]}
      >
        <Text style={[styles.headerBadgeLabel, { color: template.primary }]}>Invoice</Text>
        <Text style={[styles.invoiceNumber, { color: template.primary, textAlign: "center" }]}>
          {invoice.formattedNumber}
        </Text>
      </View>
    </View>
  );
}

export function InvoiceItemsTable({
  invoice,
  template,
}: {
  invoice: RenderableInvoice;
  template: InvoiceTemplateDefinition;
}) {
  return (
    <View
      style={[
        styles.table,
        {
          borderColor: template.border,
          borderWidth: ["classic", "bold", "accounting"].includes(template.design) ? 1.5 : 1,
          borderRadius: template.rounded ? 7 : 0,
        },
      ]}
    >
      <View
        style={[
          styles.tableHeader,
          {
            backgroundColor: template.tableHeaderBackground,
            borderBottomColor: template.secondary,
            borderBottomWidth: 2,
          },
        ]}
      >
        <Text style={[styles.descriptionCell, { color: template.tableHeaderForeground }]}>
          Description
        </Text>
        <Text style={[styles.smallCell, { color: template.tableHeaderForeground }]}>Qty</Text>
        <Text style={[styles.smallCell, { color: template.tableHeaderForeground }]}>Rate</Text>
        <Text style={[styles.smallCell, { color: template.tableHeaderForeground }]}>Amount</Text>
      </View>
      {invoice.lineItems.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.tableRow,
            {
              borderBottomColor: template.border,
              backgroundColor: index % 2 === 1 ? template.surface : template.page,
            },
          ]}
          wrap={false}
        >
          <Text style={styles.descriptionCell}>{item.description}</Text>
          <Text style={styles.smallCell}>{item.quantity}</Text>
          <Text style={styles.smallCell}>{formatInvoiceMoney(item.rate, invoice.currency)}</Text>
          <Text style={styles.smallCell}>{formatInvoiceMoney(item.amount, invoice.currency)}</Text>
        </View>
      ))}
    </View>
  );
}

export function InvoiceTotalsBlock({
  invoice,
  template,
}: {
  invoice: RenderableInvoice;
  template: InvoiceTemplateDefinition;
}) {
  return (
    <View style={styles.totalArea} wrap={false}>
      <View
        style={[
          styles.totals,
          {
            padding: 12,
            backgroundColor: template.totalBackground,
            color: template.totalForeground,
            borderColor: template.border,
            borderWidth: template.design === "minimalist" ? 1 : 0,
            borderRadius: template.rounded ? 7 : 0,
          },
        ]}
      >
        <View style={styles.totalRow}>
          <Text>Subtotal</Text>
          <Text>{formatInvoiceMoney(invoice.totals.subtotal, invoice.currency)}</Text>
        </View>
        {invoice.totals.discountType !== "none" &&
        Number(invoice.totals.discountAmount) > 0 ? (
          <View style={styles.totalRow}>
            <Text>Discount</Text>
            <Text>-{formatInvoiceMoney(invoice.totals.discountAmount, invoice.currency)}</Text>
          </View>
        ) : null}
        {Number(invoice.totals.taxAmount) > 0 ? (
          <View style={styles.totalRow}>
            <Text>Tax ({invoice.totals.taxRate}%)</Text>
            <Text>{formatInvoiceMoney(invoice.totals.taxAmount, invoice.currency)}</Text>
          </View>
        ) : null}
        <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: template.secondary }]}>
          <Text>Total</Text>
          <Text>
            {formatInvoiceMoney(invoice.totals.total, invoice.currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export interface InvoiceDocumentProps {
  invoice: RenderableInvoice;
  paymentUrl?: string;
}

export function InvoiceDocument({
  invoice,
  paymentUrl,
}: InvoiceDocumentProps): React.ReactElement<DocumentProps> {
  const template = getInvoiceTemplate(invoice.templateId);
  const cards = ["creative", "fresh", "tech", "pastel", "professional", "startup"].includes(
    template.design
  );
  const fontFamily =
    template.font === "serif"
      ? "Times-Roman"
      : template.font === "mono"
        ? "Courier"
        : "Helvetica";

  return (
    <Document
      title={`Invoice ${invoice.formattedNumber}`}
      author={senderName(invoice.sender)}
      subject={`Invoice for ${clientName(invoice.client)}`}
      creator="Stablon"
      language="en"
    >
      <Page
        size="A4"
        style={[
          styles.page,
          {
            backgroundColor: template.page,
            color: template.ink,
            fontFamily,
          },
        ]}
        wrap
      >
        <InvoiceHeader invoice={invoice} template={template} />

        <View style={[styles.parties, { gap: cards ? 14 : 24 }]}>
          <InvoiceParty
            label="From"
            name={senderName(invoice.sender)}
            contactName={invoice.sender.displayName}
            email={invoice.sender.email}
            phone={invoice.sender.phone}
            address={invoiceAddressLines(invoice.sender.address)}
            template={template}
            card={cards}
          />
          <InvoiceParty
            label="Bill to"
            name={clientName(invoice.client)}
            contactName={invoice.client.name}
            email={invoice.client.email}
            phone={invoice.client.phone}
            address={invoiceAddressLines(invoice.client.address)}
            template={template}
            card={cards}
          />
        </View>

        <View style={[styles.dates, { gap: 8 }]}>
          <View
            style={[
              styles.dateItem,
              styles.dateCard,
              {
                backgroundColor: template.surface,
                borderColor: template.border,
                borderRadius: template.rounded ? 5 : 0,
              },
            ]}
          >
            <Text style={[styles.label, { color: template.primary }]}>Issue date</Text>
            <Text style={styles.dateValue}>{formatInvoiceDate(invoice.issueDate)}</Text>
          </View>
          <View
            style={[
              styles.dateItem,
              styles.dateCard,
              {
                backgroundColor: template.surface,
                borderColor: template.border,
                borderRadius: template.rounded ? 5 : 0,
              },
            ]}
          >
            <Text style={[styles.label, { color: template.primary }]}>Due date</Text>
            <Text style={styles.dateValue}>{formatInvoiceDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <InvoiceItemsTable invoice={invoice} template={template} />
        <InvoiceTotalsBlock invoice={invoice} template={template} />

        {invoice.notes ? (
          <View
            style={[
              styles.notes,
              {
                backgroundColor: template.surface,
                borderLeftColor: template.secondary,
                borderLeftWidth: 3,
                borderRadius: template.rounded ? 5 : 0,
              },
            ]}
            wrap={false}
          >
            <Text style={[styles.label, { color: template.primary }]}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.paymentBox,
            {
              borderColor: template.border,
              backgroundColor: template.surface,
              borderRadius: template.rounded ? 5 : 0,
            },
          ]}
          wrap={false}
        >
          <Text style={[styles.label, { color: template.primary }]}>Payment terms</Text>
          <Text>{invoice.paymentTerms}</Text>
          {paymentUrl ? (
            <Link style={[styles.paymentLink, { color: template.primary }]} src={paymentUrl}>
              View and pay this invoice
            </Link>
          ) : null}
        </View>

        <View style={[styles.footer, { color: template.muted }]} fixed>
          <Text>{invoice.formattedNumber}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
