"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart } from "@/components/BarChart";
import { Cover, ErrorBox, PageHeader, Skeleton, StatCard, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { OFFERS_ENABLED } from "@/lib/flags";
import { compact, displayName, rs } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { canWrite, useAuth } from "@/lib/useAuth";
import type { AnalyticsOverview, AnalyticsTimeseries } from "@/lib/types";

function formatDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { admin } = useAuth();
  const canCreateBusiness = canWrite(admin, "businesses");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<AnalyticsTimeseries | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api<AnalyticsOverview>("/api/admin/analytics/overview", { auth: true }),
      api<AnalyticsTimeseries>("/api/admin/analytics/timeseries", { auth: true, query: { days: 14 } }),
    ])
      .then(([overview, timeseries]) => {
        setData(overview);
        setSeries(timeseries);
      })
      .catch((err) => setError(errorMessage(err, t("dashboard.load_error"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = data?.counts || {};
  const orderSpark = (series?.series ?? []).map((point) => point.orders || 0);
  const first = displayName(admin).split(" ")[0];
  const topMerchants = data?.top_merchants_by_sales ?? data?.top_businesses ?? [];

  return (
    <div>
      <PageHeader
        title={t("dashboard.welcome") + (first ? `, ${first}` : "")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <div className="flex gap-2">
            {canCreateBusiness ? (
              <Link href="/businesses/new">
                <Button type="button" variant="ghost">
                  {t("admin.new_business")}
                </Button>
              </Link>
            ) : null}
            <Link href="/orders">
              <Button type="button">{t("admin.nav_orders")}</Button>
            </Link>
          </div>
        }
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="/orders" label={t("analytics.stat_orders")} value={compact(counts.orders_total)} sparkline={orderSpark} />
          <StatCard
            href="/analytics"
            label={t("analytics.stat_sales")}
            value={counts.sales != null || counts.order_volume != null ? rs(counts.sales ?? counts.order_volume) : "—"}
          />
          <StatCard href="/businesses" label={t("dashboard.stat_businesses")} value={compact(counts.businesses)} />
          <StatCard label={t("analytics.stat_consumers")} value={compact(counts.consumers)} href="/users?account_type=consumer" />
          {OFFERS_ENABLED ? (
            <StatCard
              href="/offers"
              label={t("dashboard.stat_offers")}
              value={compact(counts.offers_total)}
              hint={t("dashboard.stat_active", { count: counts.offers_active ?? 0 })}
            />
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">{t("analytics.ops_title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            href="/orders?status=pending"
            label={t("analytics.ops_pending_orders")}
            value={compact(counts.orders_pending)}
          />
          <StatCard
            href="/orders?status=payment_submitted"
            label={t("analytics.ops_payment_review")}
            value={compact(counts.orders_payment_submitted)}
          />
          <StatCard
            href="/reports?status=open"
            label={t("analytics.ops_open_reports")}
            value={compact(counts.open_reports)}
          />
          <StatCard
            href="/businesses?verification_status=under_review"
            label={t("analytics.ops_under_review")}
            value={compact(counts.businesses_under_review)}
          />
          <StatCard
            href="/products?stock=low"
            label={t("analytics.ops_low_stock")}
            value={compact(counts.low_stock_products)}
          />
          {OFFERS_ENABLED ? (
            <StatCard
              href="/offers?review_status=pending"
              label={t("offers.filter_review")}
              value={compact(counts.offers_pending)}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t("analytics.timeseries_title")}</h2>
              <p className="text-sm text-muted">{t("analytics.legend_orders")}</p>
            </div>
            <Link href="/analytics" className="text-sm font-semibold text-deal">
              {t("dashboard.analytics")}
            </Link>
          </div>
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

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("analytics.top_merchants_sales")}</h2>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted">{t("analytics.no_data")}</p>
          ) : (
            <div className="divide-y divide-line">
              {topMerchants.slice(0, 6).map((biz, index) => (
                <Link key={biz.id} href={`/businesses/${biz.id}`} className="flex items-center gap-3 py-2.5 hover:text-deal">
                  <span className="w-5 text-xs font-bold text-muted">{index + 1}</span>
                  <span className="flex-1 font-medium">{biz.name}</span>
                  <span className="text-xs text-muted">{biz.sales != null ? rs(biz.sales) : compact(biz.scan_count)}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-paper p-3">
              <p className="text-xs text-muted">{t("analytics.stat_avg_accept")}</p>
              <p className="font-semibold">{formatDuration(counts.avg_accept_seconds)}</p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-xs text-muted">{t("analytics.stat_avg_deliver")}</p>
              <p className="font-semibold">{formatDuration(counts.avg_deliver_seconds)}</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("dashboard.recent")}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card divide-y divide-line p-2">
          {(data?.recent_businesses ?? []).slice(0, 6).map((biz) => (
            <Link key={biz.id} href={`/businesses/${biz.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-paper">
              <Cover src={biz.logo_url} label={biz.name} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{biz.name}</p>
                <p className="text-xs text-muted">{biz.category_name}</p>
              </div>
            </Link>
          ))}
          {(data?.recent_businesses ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted">{t("analytics.no_data")}</p>
          ) : null}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t("analytics.top_products")}</h3>
          {(data?.top_products ?? []).length === 0 ? (
            <p className="text-sm text-muted">{t("analytics.no_data")}</p>
          ) : (
            <div className="divide-y divide-line">
              {(data?.top_products ?? []).slice(0, 6).map((product) => (
                <div key={`${product.id}-${product.name}`} className="flex items-center gap-3 py-2.5">
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
