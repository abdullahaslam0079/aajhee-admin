"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart } from "@/components/BarChart";
import { ErrorBox, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { OFFERS_ENABLED } from "@/lib/flags";
import { compact, rs } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { AnalyticsOverview, AnalyticsTimeseries } from "@/lib/types";

function formatDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<AnalyticsTimeseries | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api<AnalyticsOverview>("/api/admin/analytics/overview", { auth: true }),
      api<AnalyticsTimeseries>("/api/admin/analytics/timeseries", { auth: true, query: { days } }),
    ])
      .then(([ov, ts]) => {
        setOverview(ov);
        setSeries(ts);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, t("analytics.load_error"))))
      .finally(() => setLoading(false));
  }, [days, t]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = overview?.counts || {};
  const topMerchants = overview?.top_merchants_by_sales ?? overview?.top_businesses ?? [];

  return (
    <div>
      <PageHeader
        title={t("analytics.title")}
        subtitle={t("analytics.overview_title")}
        actions={
          <select
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={14}>{t("analytics.days_14")}</option>
            <option value={30}>{t("analytics.days_30")}</option>
            <option value={90}>{t("analytics.days_90")}</option>
          </select>
        }
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("analytics.stat_orders")} value={compact(counts.orders_total)} href="/orders" />
          <StatCard
            label={t("analytics.stat_sales")}
            value={counts.sales != null || counts.order_volume != null ? rs(counts.sales ?? counts.order_volume) : "—"}
          />
          <StatCard
            label={t("analytics.stat_cancellation_rate")}
            value={counts.cancellation_rate != null ? `${counts.cancellation_rate}%` : "—"}
          />
          <StatCard label={t("analytics.stat_avg_accept")} value={formatDuration(counts.avg_accept_seconds)} />
          <StatCard label={t("analytics.stat_avg_deliver")} value={formatDuration(counts.avg_deliver_seconds)} />
          <StatCard label={t("analytics.stat_new_customers")} value={compact(counts.new_customers)} />
          <StatCard label={t("analytics.stat_new_merchants")} value={compact(counts.new_merchants)} />
          <StatCard label={t("analytics.stat_orders_per_day")} value={counts.orders_per_day != null ? String(counts.orders_per_day) : "—"} />
          <StatCard label={t("analytics.stat_consumers")} value={compact(counts.consumers)} href="/users" />
          {OFFERS_ENABLED ? (
            <>
              <StatCard label={t("analytics.stat_offers")} value={compact(counts.offers_total)} />
              <StatCard label={t("analytics.stat_scans")} value={compact(counts.scans)} />
              <StatCard label={t("analytics.stat_redemptions")} value={compact(counts.redemptions)} />
            </>
          ) : null}
        </div>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-semibold">{t("analytics.timeseries_title")}</h2>
        <p className="mb-4 text-sm text-muted">{t("analytics.last_n_days", { days })}</p>
        {series?.series?.length ? (
          <BarChart
            series={series.series.map((p) => ({
              date: p.date,
              scans: p.orders || 0,
              redemptions: Number(p.sales || 0),
            }))}
            scansLabel={t("analytics.legend_orders")}
            redemptionsLabel={t("analytics.legend_sales")}
          />
        ) : (
          <p className="py-10 text-sm text-muted">{t("analytics.no_data")}</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("analytics.top_merchants_sales")}</h2>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted">{t("analytics.no_data")}</p>
          ) : (
            <div className="divide-y divide-line">
              {topMerchants.map((biz, index) => (
                <LinkRow key={biz.id} href={`/businesses/${biz.id}`} title={biz.name} meta={biz.sales != null ? rs(biz.sales) : "—"} index={index} />
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("analytics.top_products")}</h2>
          {(overview?.top_products ?? []).length === 0 ? (
            <p className="text-sm text-muted">{t("analytics.no_data")}</p>
          ) : (
            <div className="divide-y divide-line">
              {(overview?.top_products ?? []).map((product, index) => (
                <div key={`${product.id}-${product.name}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-xs font-bold text-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted">{product.business_name}</p>
                  </div>
                  <span className="text-xs text-muted">{compact(product.quantity_sold)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkRow({ href, title, meta, index }: { href: string; title: string; meta: string; index: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 py-2.5 hover:text-deal">
      <span className="w-5 text-xs font-bold text-muted">{index + 1}</span>
      <span className="flex-1 font-medium">{title}</span>
      <span className="text-xs text-muted">{meta}</span>
    </Link>
  );
}
