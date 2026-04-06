export interface BridgeCustomer {
  id: string;
  full_name: string;
  email: string;
  type: "individual" | "business";
  kyc_status: "not_started" | "pending" | "approved" | "rejected" | "incomplete";
  rejection_reasons?: string[];
  created_at: string;
  updated_at: string;
}

export interface BridgeKYCLink {
  id: string;
  customer_id: string;
  kyc_link: string;
  tos_link: string;
  status: string;
  created_at: string;
}

export interface BridgeWallet {
  id: string;
  customer_id: string;
  network: string;
  address: string;
  balances: Record<string, string>;
  created_at: string;
}

export interface BridgeTransfer {
  id: string;
  customer_id: string;
  state: "awaiting_funds" | "in_review" | "funds_received" | "payment_submitted" | "payment_processed" | "completed" | "returned" | "canceled" | "error";
  source: TransferEndpoint;
  destination: TransferEndpoint;
  amount: string;
  currency: string;
  developer_fee?: string;
  on_behalf_of?: string;
  created_at: string;
  updated_at: string;
  receipt?: TransferReceipt;
}

export interface TransferEndpoint {
  payment_rail: string;
  currency: string;
  amount?: string;
  external_account_id?: string;
  bridge_wallet_id?: string;
  to_address?: string;
  from_address?: string;
}

export interface TransferReceipt {
  initial_amount: string;
  developer_fee: string;
  exchange_fee: string;
  final_amount: string;
  source_tx_hash?: string;
  destination_tx_hash?: string;
}

export interface BridgeVirtualAccount {
  id: string;
  customer_id: string;
  currency: string;
  status: "active" | "inactive";
  account_details: {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    iban?: string;
    bic?: string;
    clabe?: string;
    pix_key?: string;
  };
  source_deposit_instructions: string;
  created_at: string;
}

export interface BridgeCardAccount {
  id: string;
  customer_id: string;
  status: "active" | "frozen" | "inactive";
  card_number_last_4: string;
  card_brand: string;
  funding_type: string;
  settlement_currency: string;
  created_at: string;
}

export interface BridgeCardTransaction {
  id: string;
  card_account_id: string;
  amount: string;
  currency: string;
  merchant_name: string;
  merchant_category: string;
  status: string;
  created_at: string;
}

export interface BridgeExternalAccount {
  id: string;
  customer_id: string;
  currency: string;
  bank_name: string;
  account_owner_name: string;
  account_type: string;
  last_4: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface BridgeExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: string;
  timestamp: string;
}

export interface BridgeRewardsSummary {
  customer_id: string;
  total_earned: string;
  current_apy: string;
  currency: string;
}
