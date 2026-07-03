// Raw customer status as returned by Bridge's /customers endpoint.
export type BridgeCustomerStatus =
  | "active"
  | "under_review"
  | "rejected"
  | "incomplete"
  | "not_started"
  | "awaiting_questionnaire"
  | "awaiting_ubo"
  | "paused"
  | "offboarded";

// App-normalized KYC status the UI understands.
export type AppKycStatus = "not_started" | "pending" | "approved" | "rejected";

export interface BridgeRejectionReason {
  reason: string;
  developer_reason?: string;
  created_at?: string | null;
}

export interface BridgeCustomer {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  type: "individual" | "business";
  // Bridge's own field. `active` means KYC approved.
  status?: BridgeCustomerStatus;
  // Derived by our API from `status` so the client has a consistent value.
  kyc_status?: AppKycStatus;
  rejection_reasons?: BridgeRejectionReason[];
  requirements_due?: string[];
  future_requirements_due?: string[];
  capabilities?: Record<string, string>;
  has_accepted_terms_of_service?: boolean;
  // Hosted Terms-of-Service acceptance link, returned on the customer object.
  tos_link?: string;
  created_at: string;
  updated_at: string;
}

export interface BridgeKYCLink {
  id: string;
  customer_id: string;
  kyc_link: string;
  tos_link: string;
  status?: string;
  kyc_status?: string;
  tos_status?: string;
  created_at: string;
}

export interface BridgeWallet {
  id: string;
  customer_id: string;
  // Bridge returns this as `chain`; normalized to `network` in lib/bridge.ts.
  network: string;
  chain?: string;
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
  // Bridge reports "activated"/"deactivated"; the API layer normalizes these.
  status: string;
  currency?: string;
  // Bank details customers deposit fiat into (Bridge's real response shape).
  source_deposit_instructions?: {
    currency?: string;
    bank_name?: string;
    bank_address?: string;
    bank_routing_number?: string;
    bank_account_number?: string;
    bank_beneficiary_name?: string;
    bank_beneficiary_address?: string;
    account_holder_name?: string;
    account_number?: string;
    sort_code?: string;
    clabe?: string;
    br_code?: string;
    iban?: string;
    bic?: string;
    payment_rail?: string;
    payment_rails?: string[];
  };
  developer_fee_percent?: string;
  destination?: {
    currency?: string;
    payment_rail?: string;
    address?: string;
    bridge_wallet_id?: string;
  };
  // Normalized shape returned by our /api/accounts route for the UI.
  account_details?: {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    iban?: string;
    bic?: string;
    clabe?: string;
    pix_key?: string;
  };
  created_at: string;
}

// Flattened virtual account shape returned by /api/accounts for the UI.
export interface AppVirtualAccount {
  id: string;
  customer_id: string;
  status: string;
  currency: string;
  payment_rails: string[];
  developer_fee_percent: string | null;
  account_details: {
    bank_name?: string;
    beneficiary_name?: string;
    beneficiary_address?: string;
    account_number?: string;
    routing_number?: string;
    iban?: string;
    bic?: string;
    clabe?: string;
    br_code?: string;
  };
  destination: {
    payment_rail?: string;
    currency?: string;
    address?: string;
    bridge_wallet_id?: string;
  } | null;
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

// A single event in a virtual account's on-ramp lifecycle (funds_received →
// payment_submitted → payment_processed, etc.).
export interface BridgeVirtualAccountEvent {
  id: string;
  customer_id: string;
  virtual_account_id: string;
  type: string;
  amount: string;
  currency: string;
  developer_fee_amount?: string;
  exchange_fee_amount?: string;
  subtotal_amount?: string;
  gas_fee?: string;
  deposit_id?: string;
  destination_tx_hash?: string;
  created_at: string;
  source?: {
    description?: string;
    payment_rail?: string;
    sender_name?: string;
    sender_routing_number?: string;
    wire_message?: string;
  };
}

// Unified feed item shown in the app's "Recent Activity" list. Bridge transfers
// and virtual-account on-ramp events are both normalized into this shape.
export interface ActivityItem {
  id: string;
  kind: "transfer" | "onramp";
  type: "deposit" | "withdrawal" | "swap";
  description: string;
  amount: string;
  currency: string;
  destinationCurrency?: string;
  status: string;
  created_at: string;
  // ── Detail fields (populated for the transaction detail view) ──
  updated_at?: string;
  reference?: string;
  paymentRail?: string;
  destinationRail?: string;
  senderName?: string;
  netAmount?: string;
  subtotal?: string;
  developerFee?: string;
  exchangeFee?: string;
  gasFee?: string;
  txHash?: string;
  destinationNetwork?: string;
  destinationAddress?: string;
  depositId?: string;
}
