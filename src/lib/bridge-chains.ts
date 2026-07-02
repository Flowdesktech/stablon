// Destination chains/stablecoins Bridge supports for crypto payouts (virtual
// account onramp destinations). Kept in sync with Bridge's supported routes:
// https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes
//
// Note: Binance Smart Chain (BEP-20) is NOT supported by Bridge.
export interface DestinationChain {
  id: string; // payment_rail value sent to Bridge
  label: string;
  coins: string[]; // supported stablecoins (Bridge currency codes)
  addressHint: string;
}

export const DESTINATION_CHAINS: DestinationChain[] = [
  { id: "ethereum", label: "Ethereum (ERC-20)", coins: ["usdc", "usdt"], addressHint: "0x…" },
  { id: "tron", label: "Tron (TRC-20)", coins: ["usdt"], addressHint: "T…" },
  { id: "base", label: "Base", coins: ["usdc"], addressHint: "0x…" },
  { id: "polygon", label: "Polygon", coins: ["usdc"], addressHint: "0x…" },
  { id: "arbitrum", label: "Arbitrum", coins: ["usdc"], addressHint: "0x…" },
  { id: "optimism", label: "Optimism", coins: ["usdc"], addressHint: "0x…" },
  { id: "avalanche_c_chain", label: "Avalanche (C-Chain)", coins: ["usdc"], addressHint: "0x…" },
  { id: "solana", label: "Solana", coins: ["usdc", "usdt"], addressHint: "Solana address" },
];

export function getChain(network: string): DestinationChain | undefined {
  return DESTINATION_CHAINS.find((c) => c.id === network);
}

export function isSupportedDestination(network: string, currency: string): boolean {
  const chain = getChain(network);
  return Boolean(chain && chain.coins.includes(currency));
}
