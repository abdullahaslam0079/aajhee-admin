"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { BarChart } from "@/components/BarChart";
import { Cover, ErrorBox, PageHeader, Skeleton, StatCard, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compact, displayName, relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import type { AnalyticsOverview, AnalyticsTimeseries } from "@/lib/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const { admin } = useAuth();
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
  const scans = (series?.series ?? []).map((point) => point.scans || 0);
  const first = displayName(admin).split(" ")[0];

  return (
    <div>
      <PageHeader
        title={t("dashboard.welcome") + (first ? `, ${first}` : "")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <div className="flex gap-2">
            <Link href="/businesses/new">
              <Button type="button" variant="ghost">
                <Plus size={16} /> {t("admin.new_business")}
              </Button>
            </Link>
            <Link href="/offers/new">
              <Button type="button">
                <Plus size={16} /> {t("admin.new_offer")}
              </Button>
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
          <StatCard href="/businesses" label={t("dashboard.stat_businesses")} value={compact(counts.businesses)} />
          <StatCard
            href="/offers"
            label={t("dashboard.stat_offers")}
            value={compact(counts.offers_total)}
            hint={t("dashboard.stat_active", { count: counts.offers_active ?? 0 })}
          />
          <StatCard href="/orders" label={t("analytics.stat_orders")} value={compact(counts.orders_total)} />
          <StatCard
            href="/analytics"
            label={t("dashboard.stat_scans")}
            value={compact(counts.scans)}
            hint={t("dashboard.stat_redemptions", { count: counts.redemptions ?? counts.avails ?? 0 })}
            sparkline={scans}
          />
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
            hint={
              counts.pending_payment_proofs
                ? t("analytics.stat_pending_proofs") + `: ${counts.pending_payment_proofs}`
                : undefined
            }
          />
          <StatCard
            href="/products?stock=low"
            label={t("analytics.ops_low_stock")}
            value={compact(counts.low_stock_products)}
          />
          <StatCard
            href="/offers?review_status=pending"
            label={t("offers.filter_review")}
            value={compact(counts.offers_pending)}
          />
          <StatCard
            href="/reviews"
            label={t("admin.nav_reviews")}
            value={t("dashboard.reviews_open")}
            hint={t("dashboard.reviews_hint")}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t("analytics.timeseries_title")}</h2>
              <p className="text-sm text-muted">{t("dashboard.activity")}</p>
            </div>
            <Link href="/analytics" className="text-sm font-semibold text-deal">
              {t("dashboard.analytics")}
            </Link>
          </div>
          {series?.series?.length ? (
            <BarChart
              series={series.series}
              scansLabel={t("analytics.legend_scans")}
              redemptionsLabel={t("analytics.legend_redemptions")}
            />
          ) : (
            <p className="py-10 text-sm text-muted">{t("analytics.no_data")}</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("dashboard.top_businesses")}</h2>
          {(data?.top_businesses ?? []).length === 0 ? (
            <p className="text-sm text-muted">{t("analytics.no_data")}</p>
          ) : (
            <div className="divide-y divide-line">
              {(data?.top_businesses ?? []).slice(0, 6).map((biz, index) => (
                <Link key={biz.id} href={`/businesses/${biz.id}`} className="flex items-center gap-3 py-2.5 hover:text-deal">
                  <span className="w-5 text-xs font-bold text-muted">{index + 1}</span>
                  <span className="flex-1 font-medium">{biz.name}</span>
                  <span className="text-xs text-muted">{compact(biz.scan_count)}</span>
                </Link>
              ))}
            </div>
          )}
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
        </div>
        <div className="card divide-y divide-line p-2">
          {(data?.recent_offers ?? []).slice(0, 6).map((offer) => (
            <Link key={offer.id} href={`/offers/${offer.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-paper">
              <div className="min-w-0">
                <p className="truncate font-medium">{offer.title}</p>
                <p className="text-xs text-muted">{offer.business_name}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{relativeTime(offer.created_at, t)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
