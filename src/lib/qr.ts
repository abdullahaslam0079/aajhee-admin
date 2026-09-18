import type { AdminOffer } from "./types";

export function offerQrPayload(offer: AdminOffer, branchId?: number | null) {
  const payload: Record<string, unknown> = {
    v: 1,
    offerId: offer.id,
    qr_code: offer.qr_code,
    token: offer.qr_code,
  };
  if (branchId) payload.branch_id = branchId;
  return `AAJHEE:${JSON.stringify(payload)}`;
}
