import { getAdminDb } from "@/lib/firebase/admin";
import type { ActivityItem } from "@/types/bridge";
import type { Invoice, InvoicePaymentAttempt } from "@/types/invoicing";

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function enrichInvoiceActivity<T extends ActivityItem>(
  items: T[],
  ownerUid?: string
): Promise<T[]> {
  const transferIds = [
    ...new Set(
      items
        .filter((item) => item.kind === "transfer")
        .map((item) => item.id)
        .filter(Boolean)
    ),
  ];
  if (transferIds.length === 0) return items;

  const snapshots = await Promise.all(
    chunks(transferIds, 30).map((ids) =>
      getAdminDb()
        .collection("invoicePaymentAttempts")
        .where("providerPaymentId", "in", ids)
        .get()
    )
  );
  const attempts = snapshots.flatMap((snapshot) =>
    snapshot.docs
      .map((document) => document.data() as InvoicePaymentAttempt)
      .filter((attempt) => !ownerUid || attempt.ownerUid === ownerUid)
  );
  if (attempts.length === 0) return items;

  const invoiceIds = [...new Set(attempts.map((attempt) => attempt.invoiceId))];
  const invoiceSnapshots = await getAdminDb().getAll(
    ...invoiceIds.map((invoiceId) =>
      getAdminDb().collection("invoices").doc(invoiceId)
    )
  );
  const invoices = new Map(
    invoiceSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => {
        const invoice = snapshot.data() as Invoice;
        return [invoice.id, invoice] as const;
      })
  );
  const invoiceByTransfer = new Map(
    attempts.flatMap((attempt) => {
      const invoice = invoices.get(attempt.invoiceId);
      return attempt.providerPaymentId && invoice
        ? [[attempt.providerPaymentId, invoice] as const]
        : [];
    })
  );

  return items.map((item) => {
    const invoice = invoiceByTransfer.get(item.id);
    if (!invoice) return item;
    return {
      ...item,
      description: `Invoice ${invoice.formattedNumber} · ${item.description}`,
    };
  });
}
