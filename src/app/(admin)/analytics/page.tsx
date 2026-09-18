"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart } from "@/components/BarChart";
import { Cover, ErrorBox, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compact } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { AnalyticsOverview, AnalyticsTimeseries } from "@/lib/types";

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
          <StatCard label={t("analytics.stat_businesses")} value={compact(counts.businesses)} />
          <StatCard label={t("analytics.stat_branches")} value={compact(counts.branches)} />
          <StatCard
            label={t("analytics.stat_offers")}
            value={compact(counts.offers_total)}
            hint={t("analytics.stat_active", { count: counts.offers_active ?? 0 })}
          />
          <StatCard label={t("analytics.stat_consumers")} value={compact(counts.consumers)} />
          <StatCard label={t("analytics.stat_scans")} value={compact(counts.scans)} />
          <StatCard label={t("analytics.stat_redemptions")} value={compact(counts.redemptions ?? counts.avails)} />
          <StatCard label={t("analytics.stat_offer_views")} value={compact(counts.offer_views)} />
          <StatCard label={t("analytics.stat_offer_likes")} value={compact(counts.offer_likes)} />
        </div>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-semibold">{t("analytics.timeseries_title")}</h2>
        <p className="mb-4 text-sm text-muted">{t("analytics.last_n_days", { days })}</p>
        {series?.series?.length ? (
          <BarChart
            series={series.series}
            scansLabel={t("analytics.legend_scans")}
            redemptionsLabel={t("analytics.legend_redemptions")}
          />
        ) : (
          <p className="text-sm text-muted">{t("analytics.no_data")}</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("analytics.top_businesses")}</h2>
          <div className="divide-y divide-line">
            {(overview?.top_businesses ?? []).map((biz) => (
              <Link key={biz.id} href={`/businesses/${biz.id}`} className="flex justify-between py-2.5 hover:text-deal">
                <span>{biz.name}</span>
                <span className="text-sm text-muted">
                  {t("analytics.business_stats", {
                    scans: biz.scan_count ?? 0,
                    redemptions: biz.redemption_count ?? 0,
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">{t("analytics.recent_businesses")}</h2>
          <div className="divide-y divide-line">
            {(overview?.recent_businesses ?? []).slice(0, 8).map((biz) => (
              <Link key={biz.id} href={`/businesses/${biz.id}`} className="flex items-center gap-3 py-2.5 hover:text-deal">
                <Cover src={biz.logo_url} label={biz.name} className="h-8 w-8" />
                <span>{biz.name}</span>
              </Link>
            ))}
          </div>
          <h2 className="mb-3 mt-6 font-semibold">{t("analytics.recent_offers")}</h2>
          <div className="divide-y divide-line">
            {(overview?.recent_offers ?? []).slice(0, 8).map((offer) => (
              <Link key={offer.id} href={`/offers/${offer.id}`} className="flex justify-between py-2.5 hover:text-deal">
                <span>{offer.title}</span>
                <span className="text-sm text-muted">{offer.business_name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
