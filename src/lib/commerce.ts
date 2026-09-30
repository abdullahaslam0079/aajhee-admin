import type { AdminOrder, FulfillmentType, OrderStatus, PaymentMethod } from "./types";

/** Mirrors backend `transition_order_status` rules (same as merchant web). */
export const BUSINESS_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["awaiting_payment", "preparing", "cancelled"],
  awaiting_payment: ["payment_submitted", "cancelled"],
  payment_submitted: ["paid_confirmed", "awaiting_payment", "cancelled"],
  paid_confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting payment",
  payment_submitted: "Payment submitted",
  paid_confirmed: "Paid",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
};

export const STATUS_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept order",
  cancelled: "Cancel",
  awaiting_payment: "Request bank transfer",
  preparing: "Start preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Mark completed",
  paid_confirmed: "Confirm paid",
  payment_submitted: "Mark payment submitted",
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "accepted",
  "awaiting_payment",
  "payment_submitted",
  "paid_confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export const FULFILLMENT_LABELS: Record<string, string> = {
  pickup: "Pickup",
  local_same_day: "Same-day delivery",
  nationwide: "Nationwide",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cash_on_pickup: "Cash on pickup",
  cash_on_delivery: "Cash on delivery",
  bank_transfer: "Bank transfer",
  stripe: "Card",
  jazzcash: "JazzCash / Easypaisa",
};

/** Methods where the customer uploads a transaction screenshot (mirrors backend). */
export const PAYMENT_PROOF_METHODS = new Set<string>([
  "bank_transfer",
  "stripe",
  "jazzcash",
]);

export function requiresPaymentProof(method?: string | null): boolean {
  return Boolean(method && PAYMENT_PROOF_METHODS.has(method));
}

export function statusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "deal" {
  switch (status) {
    case "completed":
    case "paid_confirmed":
      return "success";
    case "cancelled":
      return "danger";
    case "pending":
    case "awaiting_payment":
    case "payment_submitted":
      return "warning";
    case "preparing":
    case "ready_for_pickup":
    case "out_for_delivery":
    case "accepted":
      return "deal";
    default:
      return "neutral";
  }
}

export function labelStatus(status: string, t?: (key: string) => string) {
  if (t) {
    const key = `orders.status_${status}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return STATUS_LABELS[status as OrderStatus] || status.replaceAll("_", " ");
}

export function labelFulfillment(value: string, t?: (key: string) => string) {
  if (t) {
    const key = `orders.fulfillment_${value}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return FULFILLMENT_LABELS[value] || value.replaceAll("_", " ");
}

export function labelPayment(value: string, t?: (key: string) => string) {
  if (t) {
    const key = `orders.payment_${value}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return PAYMENT_LABELS[value] || value.replaceAll("_", " ");
}

export function isPickupFulfillment(fulfillment?: FulfillmentType | string) {
  return fulfillment === "pickup";
}

export function isDeliveryFulfillment(fulfillment?: FulfillmentType | string) {
  return fulfillment === "local_same_day" || fulfillment === "nationwide";
}

/** Merchant-side actions allowed for this order (admin acts on behalf of the merchant). */
export function nextActions(order: {
  status: OrderStatus;
  fulfillment_type?: FulfillmentType | string;
  payment_method?: PaymentMethod | string;
}): OrderStatus[] {
  let actions = [...(BUSINESS_STATUS_TRANSITIONS[order.status] || [])];

  // Customer uploads proof — merchants/admins don't mark payment_submitted
  actions = actions.filter((s) => s !== "payment_submitted");

  if (order.status === "preparing") {
    if (isPickupFulfillment(order.fulfillment_type)) {
      actions = actions.filter((s) => s !== "out_for_delivery");
    } else if (isDeliveryFulfillment(order.fulfillment_type)) {
      actions = actions.filter((s) => s !== "ready_for_pickup");
    }
  }

  if (order.status === "accepted") {
    if (requiresPaymentProof(order.payment_method)) {
      actions = actions.filter((s) => s !== "preparing");
    } else {
      actions = actions.filter((s) => s !== "awaiting_payment");
    }
  }

  return actions;
}

export function nextActionsForOrder(
  order: Pick<AdminOrder, "status" | "fulfillment_type" | "payment_method">,
) {
  return nextActions(order);
}

/** Digits-only phone for wa.me links (strips spaces, dashes, leading +). */
export function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
