import { formatCurrency } from "@/lib/utils";

const FIAT = new Set(["usd", "eur", "gbp", "brl", "mxn"]);

// Formats an amount for display: fiat as currency, stablecoins/crypto as a
// plain number followed by the ticker (Intl can't format e.g. "USDC").
export function formatAmount(amount: number, currency: string | undefined): string {
  const code = (currency || "usd").toLowerCase();
  if (FIAT.has(code)) return formatCurrency(amount, code.toUpperCase());
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
  return `${num} ${code.toUpperCase()}`;
}

export function statusVariant(
  status: string
): "success" | "danger" | "warning" {
  if (status === "completed") return "success";
  if (status === "error" || status === "refunded") return "danger";
  return "warning";
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Block-explorer transaction URL keyed by the destination network label.
const EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  base: "https://basescan.org/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  avalanche: "https://snowtrace.io/tx/",
  tron: "https://tronscan.org/#/transaction/",
  solana: "https://solscan.io/tx/",
};

export function explorerTxUrl(
  network: string | undefined,
  hash: string | undefined
): string | null {
  if (!network || !hash) return null;
  const base = EXPLORERS[network.toLowerCase()];
  return base ? `${base}${hash}` : null;
}
