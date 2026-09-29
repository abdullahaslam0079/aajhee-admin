"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Empty, ErrorBox, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { formatOrderNumber } from "@/lib/orderNumber";
import type { AdminOrderProblemReport, Paginated, ReportStatus } from "@/lib/types";

const PAGE_SIZE = 20;

function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "resolved") return "success";
  if (status === "in_progress") return "warning";
  if (status === "open") return "danger";
  return "neutral";
}

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paginated<AdminOrderProblemReport> & { open_count?: number }) | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<AdminOrderProblemReport> & { open_count?: number }>("/api/admin/reports", {
      auth: true,
      query: {
        page,
        page_size: PAGE_SIZE,
        status: status || undefined,
      },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("reports.load_error"))))
      .finally(() => setLoading(false));
  }, [page, status, t]);

  useEffect(() => {
    load();
  }, [load]);

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  function labelStatus(s: string) {
    if (s === "open") return t("reports.open");
    if (s === "in_progress") return t("reports.in_progress");
    if (s === "resolved") return t("reports.resolved");
    return s;
  }

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        subtitle={
          data?.open_count != null
            ? `${t("reports.subtitle")} · ${data.open_count} ${t("reports.open").toLowerCase()}`
            : t("reports.subtitle")
        }
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["", t("common.all")],
          ["open", t("reports.open")],
          ["in_progress", t("reports.in_progress")],
          ["resolved", t("reports.resolved")],
        ].map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
              status === value ? "bg-deal-deep text-white ring-deal-deep" : "bg-surface ring-line"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <Empty title={t("reports.empty")} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("reports.col_order")}</th>
                <th className="px-4 py-3 font-semibold">{t("reports.col_customer")}</th>
                <th className="px-4 py-3 font-semibold">{t("reports.col_business")}</th>
                <th className="px-4 py-3 font-semibold">{t("reports.col_reason")}</th>
                <th className="px-4 py-3 font-semibold">{t("reports.col_date")}</th>
                <th className="px-4 py-3 font-semibold">{t("reports.col_status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((report) => (
                <tr key={report.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/reports/${report.id}`} className="font-semibold text-deal">
                      {formatOrderNumber(report.order_public_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{report.customer_name || report.customer_phone || "—"}</td>
                  <td className="px-4 py-3">{report.business_name || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3">{report.reason || report.message || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateLabel(report.created_at, locale)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(report.status as ReportStatus)}>{labelStatus(String(report.status))}</Badge>
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
