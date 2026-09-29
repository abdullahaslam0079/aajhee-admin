/** Canonical short order number: first 8 characters of the UUID string. */
export function shortOrderNumber(publicId: string | null | undefined): string {
  const raw = (publicId ?? "").trim();
  if (!raw) return "";
  return raw.slice(0, 8);
}

/** Alias used by admin list/CSV helpers. */
export const orderNumber = shortOrderNumber;

export function formatOrderNumber(publicId: string | null | undefined): string {
  const short = shortOrderNumber(publicId);
  return short ? `#${short}` : "";
}
