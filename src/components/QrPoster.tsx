"use client";

import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { offerQrPayload } from "@/lib/qr";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminOffer } from "@/lib/types";
import { Button } from "./ui";

export function QrPoster({ offer }: { offer: AdminOffer }) {
  const { t } = useI18n();
  const toast = useToast();
  const branches = offer.branches?.length ? offer.branches : offer.branch_stats?.map((s) => ({
    id: s.branch_id,
    name: s.branch_name,
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    latitude: 0,
    longitude: 0,
  })) || [];
  const [branchId, setBranchId] = useState<number | "">(branches[0]?.id ?? "");
  const payload = useMemo(
    () => (offer.qr_code ? offerQrPayload(offer, branchId || undefined) : ""),
    [offer, branchId],
  );
  const branchName = branches.find((b) => b.id === branchId)?.name;

  if (!offer.qr_code) {
    return <p className="text-sm text-muted">{t("offers.qr_unavailable")}</p>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      toast.push(t("offers.copy_success"));
    } catch {
      toast.push(t("offers.copy_error"), "error");
    }
  }

  return (
    <div className="card print-poster p-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("offers.qr_title")}</h2>
          <p className="text-sm text-muted">{t("offers.poster_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {branches.length > 1 ? (
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="button" variant="ghost" onClick={copy}>
            {t("offers.copy_qr")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.print()}>
            {t("common.print")}
          </Button>
        </div>
      </div>
      <div className="mx-auto grid max-w-sm place-items-center gap-3 text-center">
        <p className="text-lg font-semibold">{offer.title}</p>
        {branchName ? <p className="text-sm text-muted">{branchName}</p> : null}
        <div className="rounded-2xl bg-white p-4">
          <QRCodeSVG value={payload} size={220} />
        </div>
        <p className="text-xs text-muted">{t("offers.poster_scan_hint")}</p>
      </div>
    </div>
  );
}
