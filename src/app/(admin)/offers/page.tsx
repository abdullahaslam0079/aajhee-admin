"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Badge, Button, Cover, Empty, ErrorBox, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { offerStatus, percent, relativeTime } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, AdminOffer, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

function OffersPageContent() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewQueue = searchParams.get("review") === "pending";
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminOffer> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const q = useDebounced(search);

  useEffect(() => {
    api<Paginated<AdminBusiness>>("/api/admin/businesses", { auth: true, query: { page_size: 100 } })
      .then((res) => setBusinesses(pageResults(res)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [reviewQueue]);

  const load = useCallback(() => {
    api<Paginated<AdminOffer>>("/api/admin/offers", {
      auth: true,
      query: {
        search: q,
        page,
        page_size: PAGE_SIZE,
        business_id: businessId || undefined,
        is_enabled: reviewQueue ? undefined : enabled || undefined,
        review_status: reviewQueue ? "pending" : undefined,
      },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("offers.load_error"))))
      .finally(() => setLoading(false));
  }, [q, page, businessId, enabled, reviewQueue, t]);

  useEffect(() => {
    load();
  }, [load]);

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const statusTone = (offer: AdminOffer) => {
    const status = offerStatus(offer);
    if (status === "active") return "success" as const;
    if (status === "expired" || status === "rejected") return "danger" as const;
    return "warning" as const;
  };

  function setReview(next: boolean) {
    router.replace(next ? "/offers?review=pending" : "/offers");
  }

  async function approve(offer: AdminOffer) {
    try {
      await api(`/api/admin/offers/${offer.id}/approve`, { method: "POST", auth: true });
      toast.push(t("offers.approved"));
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("offers.approve_error")), "error");
    }
  }

  async function reject(offer: AdminOffer) {
    try {
      await api(`/api/admin/offers/${offer.id}/reject`, { method: "POST", auth: true });
      toast.push(t("offers.rejected"));
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("offers.reject_error")), "error");
    }
  }

  async function bulkApprove() {
    if (!selected.length) return;
    try {
      const data = await api<{ approved?: number }>("/api/admin/offers/bulk-approve", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ ids: selected }),
      });
      toast.push(t("offers.bulk_approved", { count: data.approved ?? selected.length }));
      setSelected([]);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("offers.approve_error")), "error");
    }
  }

  function toggleSelect(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div>
      <PageHeader
        title={reviewQueue ? t("offers.filter_review") : t("offers.title")}
        subtitle={count ? t("common.showing", { from, to, count }) : undefined}
        actions={
          <div className="flex gap-2">
            {reviewQueue && selected.length ? (
              <Button type="button" variant="ghost" onClick={bulkApprove}>
                {t("offers.bulk_approve")}
              </Button>
            ) : null}
            <Link href="/offers/new">
              <Button type="button">{t("offers.add")}</Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={reviewQueue ? "ghost" : "primary"} onClick={() => setReview(false)}>
          {t("offers.filter_all")}
        </Button>
        <Button type="button" variant={reviewQueue ? "primary" : "ghost"} onClick={() => setReview(true)}>
          {t("offers.filter_review")}
        </Button>
        <input
          className={`${inputClass} max-w-sm`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("offers.search_hint")}
        />
        {reviewQueue ? null : (
          <select
            className={`${inputClass} max-w-48`}
            value={enabled}
            onChange={(e) => {
              setEnabled(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("common.all")}</option>
            <option value="true">{t("offers.filter_enabled")}</option>
            <option value="false">{t("offers.filter_disabled")}</option>
          </select>
        )}
        <select
          className={`${inputClass} max-w-56`}
          value={businessId}
          onChange={(e) => {
            setBusinessId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("offers.filter_business")}</option>
          {businesses.map((biz) => (
            <option key={biz.id} value={biz.id}>
              {biz.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={reviewQueue ? t("offers.review_empty_title") : t("offers.empty_title")}
          body={reviewQueue ? t("offers.review_empty_subtitle") : t("offers.empty_subtitle")}
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {reviewQueue ? <th /> : null}
                <th>{t("offers.field_title")}</th>
                <th>{t("offers.field_business")}</th>
                <th>{t("offers.discount")}</th>
                <th>{t("offers.status")}</th>
                <th>{t("offers.created_at")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((offer) => (
                <tr key={offer.id} className="cursor-pointer" onClick={() => router.push(`/offers/${offer.id}`)}>
                  {reviewQueue ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(offer.id)}
                        onChange={() => toggleSelect(offer.id)}
                      />
                    </td>
                  ) : null}
                  <td>
                    <div className="flex items-center gap-3">
                      <Cover src={offer.image_urls?.[0]} label={offer.title} className="h-9 w-9" />
                      <div>
                        <p className="font-semibold">{offer.title}</p>
                        {offer.is_online ? <Badge tone="deal">{t("offers.online_badge")}</Badge> : null}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{offer.business_name}</td>
                  <td>{percent(offer.discount_percent) || "—"}</td>
                  <td>
                    <Badge tone={statusTone(offer)}>{t(`offers.status_${offerStatus(offer)}`)}</Badge>
                  </td>
                  <td className="text-muted">{relativeTime(offer.created_at, t)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      {reviewQueue ? (
                        <>
                          <button type="button" className="text-sm font-semibold text-deal" onClick={() => approve(offer)}>
                            {t("offers.approve")}
                          </button>
                          <button type="button" className="text-sm font-semibold text-red-600" onClick={() => reject(offer)}>
                            {t("offers.reject")}
                          </button>
                        </>
                      ) : (
                        <Link href={`/offers/${offer.id}/edit`} className="text-sm font-semibold text-deal">
                          {t("common.edit")}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

export default function OffersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <OffersPageContent />
    </Suspense>
  );
}
