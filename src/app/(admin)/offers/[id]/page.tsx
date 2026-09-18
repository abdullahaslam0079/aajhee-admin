"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrPoster } from "@/components/QrPoster";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge, Button, ConfirmDialog, ErrorBox, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateTimeLabel, money, offerStatus, percent, redemptionCount, scanCount } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminOffer } from "@/lib/types";

export default function OfferDetailPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(() => {
    api<AdminOffer>(`/api/admin/offers/${id}`, { auth: true })
      .then(setOffer)
      .catch((err) => setError(errorMessage(err, t("offers.not_found"))));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    try {
      await api(`/api/admin/offers/${id}`, { method: "DELETE", auth: true });
      toast.push(t("offers.deleted"));
      router.push("/offers");
    } catch (err) {
      toast.push(errorMessage(err, t("offers.delete_error")), "error");
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!offer) return <Skeleton className="h-40" />;

  const status = offerStatus(offer);

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: "/offers", label: t("offers.title") },
          { label: offer.title },
        ]}
      />
      <PageHeader
        title={offer.title}
        subtitle={offer.business_name}
        actions={
          <div className="flex gap-2">
            <Link href={`/offers/${id}/edit`}>
              <Button type="button" variant="ghost">{t("common.edit")}</Button>
            </Link>
            <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
              {t("offers.delete")}
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={status === "active" ? "success" : status === "expired" ? "danger" : "warning"}>
          {t(`offers.status_${status}`)}
        </Badge>
        {offer.is_online ? <Badge tone="deal">{t("offers.online_badge")}</Badge> : null}
        {offer.origin && offer.origin !== "manual" ? (
          <Badge tone="neutral">{t(`offers.origin_${offer.origin}`)}</Badge>
        ) : null}
      </div>
      {offer.image_urls?.length ? (
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {offer.image_urls.map((src) => (
            <img key={src} src={src} alt="" className="h-36 w-52 rounded-xl object-cover" />
          ))}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("offers.views")} value={offer.view_count ?? 0} />
        <StatCard label={t("offers.unique_viewers")} value={offer.unique_viewers ?? 0} />
        <StatCard label={t("offers.scans")} value={scanCount(offer)} />
        <StatCard label={t("offers.redemptions")} value={redemptionCount(offer)} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card space-y-2 p-5">
          <h2 className="font-semibold">{t("offers.details_section")}</h2>
          <p className="text-sm text-muted">{offer.description || t("common.none")}</p>
          {offer.detailed_description ? <p className="text-sm">{offer.detailed_description}</p> : null}
          {offer.external_url ? (
            <a href={offer.external_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-deal">
              {offer.external_url_label || t("offers.open_external_url")}
            </a>
          ) : null}
          {offer.source_url ? (
            <p className="text-sm text-muted">
              {t("offers.source_url")}:{" "}
              <a href={offer.source_url} target="_blank" rel="noreferrer" className="font-semibold text-deal">
                {offer.source_url}
              </a>
            </p>
          ) : null}
          {offer.origin ? (
            <p className="text-sm text-muted">
              {t("offers.origin")}: {t(`offers.origin_${offer.origin}`)}
            </p>
          ) : null}
          {offer.last_seen_at ? (
            <p className="text-sm text-muted">
              {t("offers.last_seen")}: {dateTimeLabel(offer.last_seen_at, locale)}
            </p>
          ) : null}
          {offer.unavailable_reason ? (
            <p className="text-sm text-muted">
              {t("offers.unavailable")}: {t(`offers.unavailable_${offer.unavailable_reason}`)}
            </p>
          ) : null}
          {offer.review_status === "pending" ? (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await api(`/api/admin/offers/${id}/approve`, { method: "POST", auth: true });
                    toast.push(t("offers.approved"));
                    load();
                  } catch (err) {
                    toast.push(errorMessage(err, t("offers.approve_error")), "error");
                  }
                }}
              >
                {t("offers.approve")}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  try {
                    await api(`/api/admin/offers/${id}/reject`, { method: "POST", auth: true });
                    toast.push(t("offers.rejected"));
                    load();
                  } catch (err) {
                    toast.push(errorMessage(err, t("offers.reject_error")), "error");
                  }
                }}
              >
                {t("offers.reject")}
              </Button>
            </div>
          ) : null}
          <p className="text-xs text-muted">{t("offers.created_at")}: {dateTimeLabel(offer.created_at, locale)}</p>
        </div>
        <div className="card space-y-2 p-5">
          <h2 className="font-semibold">{t("offers.pricing_section")}</h2>
          <p>{percent(offer.discount_percent) || "—"} {t("offers.field_discount_percent")}</p>
          {offer.item_name ? <p>{offer.item_name}</p> : null}
          {offer.original_price != null ? <p>{t("offers.field_original_price")}: {money(offer.original_price)}</p> : null}
          {offer.discounted_price != null ? <p>{t("offers.field_discounted_price")}: {money(offer.discounted_price)}</p> : null}
          {offer.included_items?.length ? (
            <ul className="list-disc pl-5 text-sm">
              {offer.included_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-muted">
            {t("offers.field_schedule")}:{" "}
            {offer.is_time_limited
              ? `${dateTimeLabel(offer.starts_at, locale)} – ${dateTimeLabel(offer.ends_at, locale)}`
              : t("offers.schedule_always")}
          </p>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-3 font-semibold">{t("offers.branch_performance")}</h2>
        {(offer.branch_stats ?? []).length === 0 ? (
          <p className="text-sm text-muted">{offer.is_online ? t("offers.online_only") : t("offers.no_branches")}</p>
        ) : (
          <div className="divide-y divide-line">
            {(offer.branch_stats ?? []).map((row) => (
              <div key={row.branch_id} className="flex justify-between py-2 text-sm">
                <span>{row.branch_name}</span>
                <span className="text-muted">
                  {row.scan_count} {t("offers.scans")} · {row.avail_count} {t("offers.redemptions")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <QrPoster offer={offer} />

      {confirm ? (
        <ConfirmDialog
          title={t("offers.delete_title")}
          message={t("offers.delete_message")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
