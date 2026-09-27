"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QrPoster } from "@/components/QrPoster";
import {
  Badge,
  Button,
  ConfirmDialog,
  Cover,
  ErrorBox,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import {
  compact,
  dateTimeLabel,
  money,
  offerStatus,
  redemptionCount,
  scanCount,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminOffer } from "@/lib/types";

function statusTone(status: ReturnType<typeof offerStatus>) {
  if (status === "pending") return "warning" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "paused") return "neutral" as const;
  return "success" as const;
}

export default function OfferDetailPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    api<AdminOffer>(`/api/admin/offers/${id}`, { auth: true })
      .then((data) => {
        setOffer(data);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, t("offers.not_found"))));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve() {
    setBusy(true);
    try {
      const updated = await api<AdminOffer>(`/api/admin/offers/${id}/approve`, {
        method: "POST",
        auth: true,
      });
      setOffer(updated);
      toast.push(t("offers.approved"));
    } catch (err) {
      toast.push(errorMessage(err, t("offers.approve_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      const updated = await api<AdminOffer>(`/api/admin/offers/${id}/reject`, {
        method: "POST",
        auth: true,
      });
      setOffer(updated);
      toast.push(t("offers.rejected"));
    } catch (err) {
      toast.push(errorMessage(err, t("offers.reject_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await api(`/api/admin/offers/${id}`, { method: "DELETE", auth: true });
      toast.push(t("offers.deleted"));
      router.push("/offers");
    } catch (err) {
      toast.push(errorMessage(err, t("offers.delete_error")), "error");
    }
  }

  if (error && !offer) return <ErrorBox message={error} onRetry={load} />;
  if (!offer) return <Skeleton className="h-64" />;

  const status = offerStatus(offer);
  const image = offer.image_urls?.[0];
  const canReject = offer.origin && offer.origin !== "manual";
  const originLabel =
    offer.origin === "brand_listing"
      ? t("offers.origin_brand_listing")
      : offer.origin === "affiliate_feed"
        ? t("offers.origin_affiliate_feed")
        : t("offers.origin_manual");

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
          <div className="flex flex-wrap gap-2">
            {status === "pending" ? (
              <>
                <Button type="button" disabled={busy} onClick={() => void approve()}>
                  {t("offers.approve")}
                </Button>
                {canReject ? (
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => void reject()}>
                    {t("offers.reject")}
                  </Button>
                ) : null}
              </>
            ) : null}
            <Link href={`/offers/${id}/edit`}>
              <Button type="button" variant="ghost">
                {t("common.edit")}
              </Button>
            </Link>
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              {t("offers.delete")}
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Cover src={image} label={offer.title} className="h-20 w-20" />
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(status)}>{t(`offers.status_${status}`)}</Badge>
          <Badge>{originLabel}</Badge>
          {offer.is_online ? <Badge tone="deal">{t("offers.online_badge")}</Badge> : null}
          {offer.offer_type === "item" ? (
            <Badge>{t("offers.type_item")}</Badge>
          ) : offer.offer_type === "deal" ? (
            <Badge>{t("offers.type_deal")}</Badge>
          ) : (
            <Badge>{t("offers.type_bill")}</Badge>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("offers.views")} value={compact(offer.view_count)} />
        <StatCard label={t("offers.likes")} value={compact(offer.like_count)} />
        <StatCard label={t("offers.scans")} value={compact(scanCount(offer))} />
        <StatCard label={t("offers.redemptions")} value={compact(redemptionCount(offer))} />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("offers.details_section")}</h2>
          {offer.description ? <p className="text-sm text-muted">{offer.description}</p> : null}
          {offer.detailed_description ? (
            <p className="whitespace-pre-wrap text-sm">{offer.detailed_description}</p>
          ) : null}
          {offer.discount_percent != null && offer.discount_percent !== "" ? (
            <p className="text-sm">
              <span className="text-muted">{t("offers.discount")}: </span>
              {offer.discount_percent}%
            </p>
          ) : null}
          {offer.original_price != null || offer.discounted_price != null ? (
            <p className="text-sm">
              <span className="text-muted">{t("offers.pricing_section")}: </span>
              {money(offer.discounted_price ?? offer.original_price)}
              {offer.discounted_price != null && offer.original_price != null ? (
                <span className="ml-2 text-muted line-through">{money(offer.original_price)}</span>
              ) : null}
            </p>
          ) : null}
          {offer.external_url ? (
            <p className="text-sm">
              <a href={offer.external_url} target="_blank" rel="noreferrer" className="font-semibold text-deal">
                {offer.external_url_label || t("offers.open_external_url")}
              </a>
            </p>
          ) : null}
          {offer.source_url ? (
            <p className="text-sm">
              <span className="text-muted">{t("offers.source_url")}: </span>
              <a href={offer.source_url} target="_blank" rel="noreferrer" className="text-deal">
                {offer.source_url}
              </a>
            </p>
          ) : null}
          <p className="text-sm text-muted">
            {t("offers.created_at")}: {dateTimeLabel(offer.created_at, locale === "de" ? "de-DE" : "en-GB")}
          </p>
          {offer.unavailable_reason ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("offers.unavailable")}: {offer.unavailable_reason}
            </p>
          ) : null}
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("offers.branch_performance")}</h2>
          {(offer.branch_stats ?? []).length === 0 && !(offer.branches ?? []).length ? (
            <p className="text-sm text-muted">
              {offer.is_online ? t("offers.online_only") : t("offers.no_branches")}
            </p>
          ) : (offer.branch_stats ?? []).length ? (
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
          ) : (
            <ul className="list-inside list-disc text-sm text-muted">
              {(offer.branches ?? []).map((branch) => (
                <li key={branch.id}>{branch.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <QrPoster offer={offer} />

      {confirmDelete ? (
        <ConfirmDialog
          title={t("offers.delete_title")}
          message={t("offers.delete_message")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
