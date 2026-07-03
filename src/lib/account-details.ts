import type { AppVirtualAccount } from "@/types/bridge";
import { formatPaymentRails } from "@/lib/bridge-chains";

// Builds a labeled, multi-line plain-text block of a virtual account's fiat
// deposit details, suitable for a single "copy all" action.
export function buildAccountDetailsText(account: AppVirtualAccount): string {
  const d = account.account_details || {};
  const lines: string[] = [];
  const add = (label: string, value?: string | null) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  add("Payment rail(s)", formatPaymentRails(account.payment_rails));
  add("Beneficiary name", d.beneficiary_name);
  add("Bank name", d.bank_name);
  add("Routing number", d.routing_number);
  add("Account number", d.account_number);
  add("IBAN", d.iban);
  add("BIC / SWIFT", d.bic);
  add("Beneficiary address", d.beneficiary_address);
  add("Currency", account.currency ? account.currency.toUpperCase() : undefined);

  return lines.join("\n");
}
