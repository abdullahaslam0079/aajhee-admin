"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  PageHeader,
  Pagination,
  Skeleton,
} from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/commerce";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { Paginated, ProductReview } from "@/lib/types";

const PAGE_SIZE = 20;

export default function ReviewsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <ReviewsList />
    </Suspense>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

function ReviewsList() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "";
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ProductReview> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  function patchQuery(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(qs ? `/reviews?${qs}` : "/reviews");
    setPage(1);
  }

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<ProductReview> | ProductReview[]>("/api/admin/reviews", {
      auth: true,
      query: {
        status: status || undefined,
        page,
        page_size: PAGE_SIZE,
      },
    })
      .then((res) => {
        setData({
          count: Array.isArray(res) ? res.length : res.count,
          page: Array.isArray(res) ? 1 : res.page,
          page_size: Array.isArray(res) ? PAGE_SIZE : res.page_size,
          results: pageResults(res),
        });
        setError("");
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(reviewId: number, action: "hide" | "restore" | "dismiss-flag") {
    setBusyId(reviewId);
    try {
      await api(`/api/admin/reviews/${reviewId}/${action}`, {
        method: "POST",
        auth: true,
      });
      toast.push(t("reviews.action_ok"), "success");
      load();
    } catch (err) {
      toast.push(errorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  const results = data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reviews.title")}
        subtitle={t("reviews.subtitle")}
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: t("reviews.filter_all") },
          { value: "flagged", label: t("reviews.filter_flagged") },
          { value: "published", label: t("reviews.filter_published") },
          { value: "hidden", label: t("reviews.filter_hidden") },
        ].map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => patchQuery({ status: opt.value })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              status === opt.value
                ? "bg-ink text-white"
                : "bg-surface-2 text-muted hover:bg-surface-3"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading ? <Skeleton className="h-64" /> : null}

      {!loading && !error && results.length === 0 ? (
        <Empty title={t("reviews.empty")} body={t("reviews.empty_hint")} />
      ) : null}

      {!loading && results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t("reviews.col_product")}</th>
                <th className="px-4 py-3">{t("reviews.col_rating")}</th>
                <th className="px-4 py-3">{t("reviews.col_status")}</th>
                <th className="px-4 py-3">{t("reviews.col_date")}</th>
                <th className="px-4 py-3 text-right">{t("reviews.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((review) => (
                <tr key={review.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{review.product_name}</p>
                    <p className="text-xs text-muted">{review.business_name}</p>
                    {review.comment ? (
                      <p className="mt-1 line-clamp-2 text-muted">{review.comment}</p>
                    ) : null}
                    {review.flag_reason ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Flag: {review.flag_reason}
                      </p>
                    ) : null}
                    {review.order_public_id ? (
                      <Link
                        href={`/orders/${review.order_public_id}`}
                        className="mt-1 inline-block text-xs font-semibold text-deal"
                      >
                        View order
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={review.rating} />
                    <p className="text-xs text-muted">{review.user_display_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        review.status === "flagged"
                          ? "warning"
                          : review.status === "hidden"
                            ? "danger"
                            : "success"
                      }
                    >
                      {review.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(review.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {review.status === "flagged" ? (
                        <Button
variant="soft"
                          disabled={busyId === review.id}
                          onClick={() => act(review.id, "dismiss-flag")}
                        >
                          {t("reviews.dismiss_flag")}
                        </Button>
                      ) : null}
                      {review.status !== "hidden" ? (
                        <Button
variant="danger"
                          disabled={busyId === review.id}
                          onClick={() => act(review.id, "hide")}
                        >
                          {t("reviews.hide")}
                        </Button>
                      ) : (
                        <Button
disabled={busyId === review.id}
                          onClick={() => act(review.id, "restore")}
                        >
                          {t("reviews.restore")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && data.count > PAGE_SIZE ? (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          count={data.count}
          onPage={setPage}
          showingLabel={t("common.showing", {
            from: (page - 1) * PAGE_SIZE + 1,
            to: Math.min(page * PAGE_SIZE, data.count),
            count: data.count,
          })}
          previousLabel={t("common.previous")}
          nextLabel={t("common.next")}
        />
      ) : null}
    </div>
  );
}
