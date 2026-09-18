import type { AdminOffer, AdminUser } from "./types";

export function money(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export function percent(value?: number | string | null) {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return null;
  return `${Math.round(n)}%`;
}

export function compact(value?: number | null) {
  const n = value ?? 0;
  return new Intl.NumberFormat("de-DE", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

export function displayName(
  user: { first_name?: string; last_name?: string; email?: string } | null,
) {
  if (!user) return "Admin";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || user.email || "Admin";
}

export function userLabel(user: AdminUser) {
  return displayName(user) || user.email;
}

export function dateLabel(value?: string | null, locale = "de-DE") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTimeLabel(value?: string | null, locale = "de-DE") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function offerStatus(
  offer: AdminOffer,
): "active" | "paused" | "expired" | "pending" | "rejected" {
  if (offer.review_status === "pending") return "pending";
  if (offer.review_status === "rejected") return "rejected";
  if (offer.is_enabled === false || offer.is_active === false) return "paused";
  if (offer.is_time_limited && offer.ends_at) {
    const end = new Date(offer.ends_at);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return "expired";
  }
  return "active";
}

export function scanCount(offer: AdminOffer) {
  return (offer.branch_stats ?? []).reduce((sum, row) => sum + (row.scan_count || 0), 0);
}

export function redemptionCount(offer: AdminOffer) {
  return (offer.branch_stats ?? []).reduce((sum, row) => sum + (row.avail_count || 0), 0);
}

export function relativeTime(value?: string | null, t?: (key: string, vars?: Record<string, string | number>) => string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const delta = Date.now() - d.getTime();
  const minutes = Math.max(0, Math.round(delta / 60000));
  if (!t) {
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / 1440)}d ago`;
  }
  if (minutes < 1) return t("common.just_now");
  if (minutes < 60) return t("common.minutes_ago", { n: minutes });
  if (minutes < 1440) return t("common.hours_ago", { n: Math.round(minutes / 60) });
  return t("common.days_ago", { n: Math.round(minutes / 1440) });
}

export function tokenExpiryMs(token?: string | null) {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = json + "=".repeat((4 - (json.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function branchAddress(branch: {
  formattedAddress?: string;
  formatted_address?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
}) {
  return (
    branch.formattedAddress ||
    branch.formatted_address ||
    [branch.street, branch.house_number].filter(Boolean).join(" ") +
      (branch.postal_code || branch.city
        ? `, ${[branch.postal_code, branch.city].filter(Boolean).join(" ")}`
        : "")
  );
}
