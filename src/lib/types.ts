export type Paginated<T> = {
  count: number;
  page: number;
  page_size: number;
  results: T[];
};

export type AdminProfile = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
};

export type AdminAuthPayload = {
  access: string;
  refresh?: string;
  admin: AdminProfile;
};

export type Category = {
  id: number;
  name: string;
  business_count?: number;
};

export type PresenceMode = "online_only" | "instore_only" | "hybrid";
export type OnlineCoverage = "city" | "country";

export type AdminBusiness = {
  id: number;
  name: string;
  email?: string;
  logo_url?: string | null;
  category_id?: number;
  category_name?: string;
  presence_mode?: PresenceMode | string;
  online_coverage?: OnlineCoverage | string;
  owner_id?: number;
  owner_email?: string;
  owner_is_active?: boolean;
  branch_count?: number;
  offer_count?: number;
  scan_count?: number;
  redemption_count?: number;
  view_count?: number;
  like_count?: number;
};

export type AdminBranch = {
  id: number;
  business_id?: number;
  business_name?: string;
  name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  latitude: number | string;
  longitude: number | string;
  formattedAddress?: string;
  formatted_address?: string;
};

export type BranchContact = {
  id?: number;
  contact_type: "whatsapp" | "phone" | "email" | string;
  value: string;
  is_primary?: boolean;
};

export type BranchFulfillmentSettings = {
  pickup_enabled: boolean;
  pickup_radius_km: string | number;
  same_day_enabled: boolean;
  same_day_fee: string | number;
  same_day_max_delivery_hours: number;
  nationwide_enabled: boolean;
  nationwide_delivery_fee: string | number;
  nationwide_max_delivery_hours: number;
  customer_cancel_policy: "disabled" | "window_minutes" | string;
  customer_cancel_window_minutes: number;
  bank_transfer_enabled: boolean;
  bank_transfer_instructions: string;
  cash_on_pickup_enabled: boolean;
  cash_on_delivery_enabled: boolean;
  updated_at?: string;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "cancelled"
  | "awaiting_payment"
  | "payment_submitted"
  | "paid_confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed";

export type FulfillmentType = "pickup" | "local_same_day" | "nationwide";
export type PaymentMethod =
  | "cash_on_pickup"
  | "cash_on_delivery"
  | "bank_transfer"
  | "stripe"
  | "jazzcash";
export type PaymentProofReviewStatus = "pending" | "accepted" | "rejected";

export type OrderItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  unit_base_price: string;
  unit_sale_price: string | null;
  unit_discount_percent: string;
  quantity: number;
  line_total: string;
};

export type OrderPaymentProof = {
  id: number;
  file_url: string | null;
  note: string;
  submitted_at: string;
  review_status: PaymentProofReviewStatus;
  reviewed_at: string | null;
  review_note: string;
};

export type OrderDeliverySnapshot = {
  fulfillment_type: FulfillmentType;
  delivery_fee: string;
  max_delivery_hours: number;
  promised_by: string | null;
  branch_city_name?: string;
  customer_city_name?: string;
};

export type AdminOrder = {
  id: number;
  public_id: string;
  business_id: number;
  business_name: string;
  branch_id: number;
  branch_name: string;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  payment_method: PaymentMethod;
  subtotal: string;
  delivery_fee: string;
  total: string;
  delivery_address_text: string;
  customer_notes: string;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  payment_status?: string;
  delivery_house_number?: string;
  delivery_landmark?: string;
  customer_cancel_allowed?: boolean;
  customer_cancel_until?: string | null;
  can_customer_cancel?: boolean;
  cancelled_by?: string;
  cancel_reason?: string;
  cancelled_at?: string | null;
  placed_at: string;
  updated_at: string;
  items: OrderItem[];
  delivery_snapshot?: OrderDeliverySnapshot | null;
  payment_proofs: OrderPaymentProof[];
  bank_transfer_instructions?: string;
};

export type ProductGalleryImage = {
  id: number;
  image_url: string | null;
  source_url?: string;
  sort_order?: number;
};

export type OfferType = "item" | "percentage_bill" | "deal";
export type UsageLimitType =
  | "one_time"
  | "once_per_week"
  | "once_per_month"
  | "n_times_per_week"
  | "n_times_per_month"
  | "n_times_total";

export type OfferBranchStat = {
  branch_id: number;
  branch_name: string;
  scan_count: number;
  avail_count: number;
};

export type AdminOffer = {
  id: number;
  business_id: number;
  business_name?: string;
  offer_type: OfferType | string;
  redemption_mode?: string;
  title: string;
  description?: string;
  detailed_description?: string;
  external_url?: string | null;
  external_url_label?: string | null;
  image_urls?: string[];
  discount_percent?: number | string;
  item_name?: string;
  included_items?: string[];
  original_price?: number | string | null;
  discounted_price?: number | string | null;
  usage_limit_type?: UsageLimitType | string;
  usage_limit_count?: number;
  is_online?: boolean;
  branch_ids?: number[];
  branches?: AdminBranch[];
  is_enabled?: boolean;
  is_time_limited?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  qr_code?: string;
  is_active?: boolean;
  category_name?: string;
  branch_stats?: OfferBranchStat[];
  view_count?: number;
  like_count?: number;
  unique_viewers?: number;
  created_at?: string;
  origin?: "manual" | "brand_listing" | "affiliate_feed" | string;
  source_id?: number | null;
  source_url?: string | null;
  source_key?: string | null;
  review_status?: "pending" | "approved" | "rejected" | string;
  last_seen_at?: string | null;
  last_synced_at?: string | null;
  unavailable_reason?: string | null;
  disabled_by?: "sync" | "admin" | string | null;
};

export type DealSourceKind = "brand_listing" | "affiliate_feed";

export type AdminDealSource = {
  id: number;
  business_id: number;
  business_name?: string;
  name?: string;
  kind: DealSourceKind | string;
  listing_url?: string;
  feed_url?: string;
  is_enabled?: boolean;
  is_online?: boolean;
  max_items?: number;
  last_synced_at?: string | null;
  last_error?: string;
  created_at?: string;
};

export type DealSourceSyncResult = {
  discovered?: number;
  created?: number;
  updated?: number;
  skipped_rejected?: number;
  skipped_manual?: number;
  disabled_missing?: number;
  disabled_unavailable?: number;
  reenabled?: number;
  errors?: number;
  error_samples?: string[];
};

export type DealSourceSyncPayload = {
  message?: string;
  result?: DealSourceSyncResult;
  source?: AdminDealSource;
};

export type OfferImportDraft = {
  source_url?: string;
  title?: string;
  description?: string;
  detailed_description?: string;
  original_price?: number | string | null;
  currency?: string;
  image_urls?: string[];
  external_url?: string | null;
  external_url_label?: string | null;
  suggested_offer_type?: OfferType | string;
  suggested_category?: string;
  suggested_discount_percent?: number | string;
  warnings?: string[];
  ai_enriched?: boolean;
};

export type AdminUser = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  account_type?: "consumer" | "business" | string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string | null;
  business_id?: number | null;
  business_name?: string | null;
};

export type AnalyticsCounts = {
  consumers?: number;
  businesses?: number;
  branches?: number;
  offers_total?: number;
  offers_active?: number;
  offers_pending?: number;
  scans?: number;
  avails?: number;
  redemptions?: number;
  offer_views?: number;
  offer_likes?: number;
  business_views?: number;
  business_likes?: number;
  users_total?: number;
  orders_total?: number;
  orders_pending?: number;
  orders_payment_submitted?: number;
  pending_payment_proofs?: number;
  low_stock_products?: number;
  order_volume?: string | number;
};

export type TopBusiness = {
  id: number;
  name: string;
  scan_count?: number;
  redemption_count?: number;
};

export type AnalyticsOverview = {
  counts: AnalyticsCounts;
  top_businesses?: TopBusiness[];
  recent_businesses?: AdminBusiness[];
  recent_offers?: AdminOffer[];
};

export type TimeseriesPoint = {
  date: string;
  scans: number;
  redemptions: number;
  views?: number;
};

export type AnalyticsTimeseries = {
  days: number;
  series: TimeseriesPoint[];
};
