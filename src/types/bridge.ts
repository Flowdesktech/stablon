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

// App-normalized KYC status the UI understands. `incomplete` means the customer
// has started but Bridge still needs action from them (e.g. a government ID doc).
export type AppKycStatus =
  | "not_started"
  | "incomplete"
  | "pending"
  | "approved"
  | "rejected";

export interface BridgeRejectionReason {
  reason: string;
  developer_reason?: string;
  created_at?: string | null;
}

// Per-rail/service approval on a customer (e.g. `base` for USD, `sepa` for EUR).
export interface BridgeEndorsementRequirements {
  complete?: string[];
  pending?: string[];
  missing?: { all_of?: string[]; any_of?: string[] };
  issues?: string[];
}

export interface BridgeEndorsement {
  name: string;
  status: string; // approved | incomplete | revoked …
  additional_requirements?: string[];
  requirements?: BridgeEndorsementRequirements;
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
  endorsements?: BridgeEndorsement[];
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

// ─── Direct (API-based) KYC ─────────────────────────────────────
// Submitted straight to Bridge's Customers API instead of the hosted Persona
// redirect. "little" collects the minimum identity fields (no documents);
// "advanced" adds ID document images, a profile questionnaire, and proof of
// address so higher-assurance endorsements (e.g. SEPA) can be requested.
export type DirectKycMode = "little" | "advanced";

export interface KycAddress {
  street_line_1: string;
  street_line_2?: string;
  city: string;
  subdivision?: string; // ISO 3166-2 subdivision, WITHOUT the country prefix
  postal_code: string;
  country: string; // ISO 3166-1 alpha-3
}

export interface KycIdentifyingInfo {
  type: string; // passport | drivers_license | national_id | ssn | …
  issuing_country: string; // ISO 3166-1 alpha-3
  number: string;
  image_front?: string; // data:image/…;base64,… (advanced only)
  image_back?: string;
}

export interface KycDocument {
  purposes: string[]; // e.g. ["proof_of_address"]
  file: string; // data:image/…;base64,…
}

// A selectable occupation from Bridge's GET /lists/occupation_codes.
export interface OccupationCode {
  display_name: string;
  code: string;
}

// Full payload sent to Bridge POST/PUT /customers for direct KYC.
export interface DirectKycPayload {
  type: "individual";
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  birth_date: string; // YYYY-MM-DD
  residential_address: KycAddress;
  signed_agreement_id: string;
  endorsements?: string[];
  identifying_information: KycIdentifyingInfo[];
  documents?: KycDocument[];
  // Advanced-only profile questionnaire (required for EEA / high-risk).
  employment_status?: string;
  expected_monthly_payments_usd?: string;
  source_of_funds?: string;
  account_purpose?: string;
  most_recent_occupation?: string;
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
    iban?: string;
    bic?: string;
    payment_rail?: string;
    payment_rails?: string[];
  };
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
  account_details: {
    bank_name?: string;
    beneficiary_name?: string;
    beneficiary_address?: string;
    account_number?: string;
    routing_number?: string;
    iban?: string;
    bic?: string;
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
  exchangeFee?: string;
  gasFee?: string;
  txHash?: string;
  destinationNetwork?: string;
  destinationAddress?: string;
  depositId?: string;
}
