"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Cover,
  Empty,
  ErrorBox,
  PageHeader,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { offerStatus } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, AdminOffer, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

function statusTone(status: ReturnType<typeof offerStatus>) {
  if (status === "pending") return "warning" as const;
  if (status === "rejected" || status === "expired") return "danger" as const;
  if (status === "paused") return "neutral" as const;
  return "success" as const;
}

function statusLabel(status: ReturnType<typeof offerStatus>, t: (key: string) => string) {
  return t(`offers.status_${status}`);
}

export default function OffersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <OffersList />
    </Suspense>
  );
}

function OffersList() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const reviewStatus = searchParams.get("review_status") || "";
  const businessId = searchParams.get("business_id") || "";
  const [enabledFilter, setEnabledFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminOffer> | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const q = useDebounced(search.trim());

  function patchQuery(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(qs ? `/offers?${qs}` : "/offers");
    setPage(1);
  }

  const load = useCallback(() => {
    api<Paginated<AdminOffer> | AdminOffer[]>("/api/admin/offers", {
      auth: true,
      query: {
        search: q || undefined,
        review_status: reviewStatus || undefined,
        is_enabled: enabledFilter || undefined,
        business_id: businessId || undefined,
        page,
        page_size: PAGE_SIZE,
      },
    })
      .then((payload) => {
        if (Array.isArray(payload)) {
          setData({ count: payload.length, page: 1, page_size: PAGE_SIZE, results: payload });
        } else {
          setData(payload);
        }
        setError("");
      })
      .catch((err) => setError(errorMessage(err, t("offers.load_error"))))
      .finally(() => setLoading(false));
  }, [q, reviewStatus, enabledFilter, businessId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<Paginated<AdminBusiness> | AdminBusiness[]>("/api/admin/businesses", {
      auth: true,
      query: { page_size: 200 },
    })
      .then((payload) => setBusinesses(pageResults(payload)))
      .catch(() => undefined);
  }, []);

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const hasFilters = Boolean(q || reviewStatus || enabledFilter || businessId);
  const pageIds = items.map((o) => o.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const pendingSelected = selected.filter((id) => {
    const offer = items.find((o) => o.id === id);
    return offer && offerStatus(offer) === "pending";
  });

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectPage() {
    if (allOnPageSelected) setSelected((prev) => prev.filter((id) => !pageIds.includes(id)));
    else setSelected((prev) => Array.from(new Set([...prev, ...pageIds])));
  }

  async function bulkApprove() {
    const ids = pendingSelected.length ? pendingSelected : selected;
    if (!ids.length) {
      toast.push(t("offers.approve_error"), "error");
      return;
    }
    setBulkBusy(true);
    try {
      const result = await api<{ approved?: number }>("/api/admin/offers/bulk-approve", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ ids }),
      });
      toast.push(t("offers.bulk_approved", { count: result?.approved ?? ids.length }));
      setSelected([]);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("offers.approve_error")), "error");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("offers.title")}
        subtitle={
          count
            ? t("common.showing", { from, to, count })
            : t("offers.empty_subtitle")
        }
        actions={
          <div className="flex gap-2">
            <Link href="/offers?review_status=pending">
              <Button type="button" variant="ghost">
                {t("offers.filter_review")}
              </Button>
            </Link>
            <Link href="/offers/new">
              <Button type="button">{t("offers.add")}</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={`${inputClass} min-w-[220px] flex-1`}
          placeholder={t("offers.search_hint")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={`${inputClass} w-auto min-w-[180px]`}
          value={businessId}
          onChange={(e) => patchQuery({ business_id: e.target.value })}
          aria-label={t("offers.filter_business")}
        >
          <option value="">{t("common.all")}</option>
          {businesses.map((biz) => (
            <option key={biz.id} value={biz.id}>
              {biz.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={reviewStatus}
          onChange={(e) => patchQuery({ review_status: e.target.value })}
          aria-label={t("offers.filter_review")}
        >
          <option value="">{t("offers.filter_all")}</option>
          <option value="pending">{t("offers.status_pending")}</option>
          <option value="approved">{t("offers.status_active")}</option>
          <option value="rejected">{t("offers.status_rejected")}</option>
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={enabledFilter}
          onChange={(e) => {
            setEnabledFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t("offers.field_status")}
        >
          <option value="">{t("common.all")}</option>
          <option value="true">{t("offers.filter_enabled")}</option>
          <option value="false">{t("offers.filter_disabled")}</option>
        </select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      {items.length > 0 ? (
        <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectPage} />
            {t("common.showing", { from: selected.length, to: selected.length, count: selected.length })}
          </label>
          <Button
            type="button"
            disabled={bulkBusy || selected.length === 0}
            onClick={() => void bulkApprove()}
          >
            {bulkBusy ? t("common.saving") : t("offers.bulk_approve")}
          </Button>
          {selected.length ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-ink"
              onClick={() => setSelected([])}
            >
              {t("common.cancel")}
            </button>
          ) : null}
        </div>
      ) : null}

      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={reviewStatus === "pending" ? t("offers.review_empty_title") : t("offers.empty_title")}
          body={
            reviewStatus === "pending"
              ? t("offers.review_empty_subtitle")
              : hasFilters
                ? t("common.no_results")
                : t("offers.empty_subtitle")
          }
          action={
            hasFilters ? undefined : (
              <Link href="/offers/new">
                <Button type="button">{t("offers.add")}</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-8" />
                <th>{t("offers.field_title")}</th>
                <th>{t("offers.field_business")}</th>
                <th>{t("offers.field_type")}</th>
                <th>{t("offers.status")}</th>
                <th>{t("offers.origin")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((offer) => {
                const status = offerStatus(offer);
                const image = offer.image_urls?.[0];
                return (
                  <tr
                    key={offer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/offers/${offer.id}`)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(offer.id)}
                        onChange={() => toggleSelect(offer.id)}
                        aria-label={offer.title}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Cover src={image} label={offer.title} className="h-9 w-9" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{offer.title}</p>
                          {offer.is_online ? (
                            <Badge tone="deal">{t("offers.online_badge")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{offer.business_name || "—"}</td>
                    <td className="text-muted">
                      {offer.offer_type === "item"
                        ? t("offers.type_item")
                        : offer.offer_type === "deal"
                          ? t("offers.type_deal")
                          : t("offers.type_bill")}
                    </td>
                    <td>
                      <Badge tone={statusTone(status)}>{statusLabel(status, t)}</Badge>
                    </td>
                    <td className="text-muted">
                      {offer.origin === "brand_listing"
                        ? t("offers.origin_brand_listing")
                        : offer.origin === "affiliate_feed"
                          ? t("offers.origin_affiliate_feed")
                          : t("offers.origin_manual")}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/offers/${offer.id}`}
                        className="text-sm font-semibold text-deal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("common.view")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        count={count}
        onPage={setPage}
        showingLabel={t("common.showing", { from, to, count })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
      />
    </div>
  );
}
