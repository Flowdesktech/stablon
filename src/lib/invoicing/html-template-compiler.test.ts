import { describe, expect, it, vi } from "vitest";
import type { RenderableInvoice } from "./renderable";

vi.mock("server-only", () => ({}));

import {
  adaptRenderableInvoiceToHtmlTemplate,
  compileInvoiceHtml,
  INVOICE_HTML_TEMPLATE_IDS,
} from "./html-template-compiler";

function invoiceFixture(
  overrides: Partial<RenderableInvoice> = {}
): RenderableInvoice {
  return {
    formattedNumber: "INV-00042",
    issueDate: "2026-08-01",
    dueDate: "2026-08-15",
    currency: "USD",
    lineItems: [
      {
        id: "line-1",
        description: "Product design",
        quantity: "2",
        rate: "150.00",
        amount: "300.00",
      },
    ],
    totals: {
      subtotal: "300.00",
      discountType: "none",
      discountValue: "0",
      discountAmount: "0.00",
      taxableAmount: "300.00",
      taxRate: "0",
      taxAmount: "0.00",
      total: "300.00",
    },
    notes: "Thank you for your business.",
    paymentTerms: "Due within 14 days",
    templateId: "modern-blue",
    sender: {
      profileId: "profile-1",
      displayName: "Stablon Studio",
      company: "Stablon Studio LLC",
      email: "billing@example.com",
      phone: "+1 555 0100",
      address: {
        street: "1 Market Street",
        street2: "Suite 200",
        city: "San Francisco",
        subdivision: "CA",
        postalCode: "94105",
        country: "USA",
      },
    },
    client: {
      clientId: "client-1",
      name: "Alex Client",
      company: "Client Co.",
      email: "alex@example.com",
      phone: "+1 555 0200",
      address: {
        street: "2 Main Street",
        city: "New York",
        subdivision: "NY",
        postalCode: "10001",
        country: "USA",
      },
    },
    ...overrides,
  };
}

describe("invoice HTML template compiler", () => {
  it("compiles every canonical template ID with common styles and header", () => {
    expect(INVOICE_HTML_TEMPLATE_IDS).toHaveLength(15);

    for (const templateId of INVOICE_HTML_TEMPLATE_IDS) {
      const html = compileInvoiceHtml(
        invoiceFixture({ templateId })
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('id="common-styles"');
      expect(html).toContain('id="invoice-print-root"');
      expect(html).toContain('class="running-header"');
      expect(html).toContain("INV-00042");
      expect(html).toContain("Product design");
      expect(html.match(/id="common-styles"/g)).toHaveLength(1);
    }
  });

  it("adapts subdivision and postalCode to the legacy address shape", () => {
    const data = adaptRenderableInvoiceToHtmlTemplate(invoiceFixture());

    expect(data.senderAddress).toMatchObject({
      state: "CA",
      zipCode: "94105",
    });
    expect(data.customer.address).toMatchObject({
      state: "NY",
      zipCode: "10001",
    });
    expect(data.senderAddressStreet).toBe("1 Market Street, Suite 200");
    expect(data.senderAddressCityStateZip).toBe("San Francisco, CA 94105");
    expect(data.customerAddressCityStateZip).toBe("New York, NY 10001");
  });

  it("escapes user-controlled fields, including multiline notes", () => {
    const invoice = invoiceFixture({
      formattedNumber: '<script id="number">bad()</script>',
      lineItems: [
        {
          id: "line-1",
          description: '<img src=x onerror="bad()">',
          quantity: "1",
          rate: "10",
          amount: "10",
        },
      ],
      notes: "<script>bad()</script>\nsecond & line",
      paymentTerms: '<b onclick="bad()">now</b>',
      sender: {
        ...invoiceFixture().sender,
        displayName: "<Sender & Co>",
      },
      client: {
        ...invoiceFixture().client,
        name: "<Client & Co>",
      },
    });

    const html = compileInvoiceHtml(invoice);

    expect(html).not.toContain('<script id="number">');
    expect(html).not.toContain("<script>bad()</script>");
    expect(html).not.toContain('<img src=x onerror="bad()">');
    expect(html).toContain("&lt;Sender &amp; Co&gt;");
    expect(html).toContain("&lt;Client &amp; Co&gt;");
    expect(html).toContain(
      "&lt;script&gt;bad()&lt;/script&gt;<br>second &amp; line"
    );
    expect(html).toContain(
      "&lt;b onclick&#x3D;&quot;bad()&quot;&gt;now&lt;/b&gt;"
    );
  });

  it("handles absent optional party fields without placeholder leakage", () => {
    const base = invoiceFixture();
    const invoice = invoiceFixture({
      notes: "",
      sender: {
        ...base.sender,
        phone: undefined,
        address: {
          ...base.sender.address,
          street2: undefined,
          subdivision: undefined,
        },
      },
      client: {
        ...base.client,
        company: undefined,
        phone: undefined,
        address: {
          ...base.client.address,
          street2: undefined,
          subdivision: undefined,
        },
      },
    });

    const data = adaptRenderableInvoiceToHtmlTemplate(invoice);
    const html = compileInvoiceHtml(invoice);

    expect(data.senderPhone).toBe("");
    expect(data.customer.company).toBe("");
    expect(data.senderAddressCityStateZip).toBe("San Francisco 94105");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  it("adds a native discount row before the total", () => {
    const html = compileInvoiceHtml(
      invoiceFixture({
        totals: {
          subtotal: "300.00",
          discountType: "percent",
          discountValue: "10",
          discountAmount: "30.00",
          taxableAmount: "270.00",
          taxRate: "0",
          taxAmount: "0.00",
          total: "270.00",
        },
      })
    );

    expect(html).toContain('class="total-row discount-row"');
    expect(html).toContain("Discount (10%)");
    expect(html).toContain("-$30.00");
    expect(html.indexOf("Discount (10%)")).toBeLessThan(
      html.indexOf("Total Due")
    );
  });

  it("renders only safe payment URLs and escapes their attributes", () => {
    const safeHtml = compileInvoiceHtml(
      invoiceFixture(),
      "https://pay.example.test/checkout?invoice=42&source=email"
    );
    const unsafeHtml = compileInvoiceHtml(
      invoiceFixture(),
      "javascript:alert(1)"
    );

    expect(safeHtml).toContain('class="invoice-payment-action"');
    expect(safeHtml).toContain(
      'href="https://pay.example.test/checkout?invoice&#x3D;42&amp;source&#x3D;email"'
    );
    expect(safeHtml).toContain("Pay invoice online");
    expect(unsafeHtml).not.toContain('class="invoice-payment-action"');
    expect(unsafeHtml).not.toContain("javascript:");
  });
});
