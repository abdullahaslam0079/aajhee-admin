"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, ErrorBox, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { isOwner, useAuth } from "@/lib/useAuth";
import type { AuditLogEntry, Paginated } from "@/lib/types";

const PAGE_SIZE = 30;

export default function AuditPage() {
  const { t, locale } = useI18n();
  const { admin } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [data, setData] = useState<Paginated<AuditLogEntry> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!isOwner(admin)) return;
    setLoading(true);
    api<Paginated<AuditLogEntry>>("/api/admin/audit-logs", {
      auth: true,
      query: { page, page_size: PAGE_SIZE, action: action || undefined },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("audit.load_error"))))
      .finally(() => setLoading(false));
  }, [page, action, admin, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (admin && !isOwner(admin)) {
    return <ErrorBox message="Owner access required." />;
  }

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  return (
    <div>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      <div className="mb-4">
        <input
          className={`${inputClass} max-w-xs`}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action…"
        />
      </div>
      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <Empty title={t("audit.empty")} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("audit.col_when")}</th>
                <th className="px-4 py-3 font-semibold">{t("audit.col_who")}</th>
                <th className="px-4 py-3 font-semibold">{t("audit.col_action")}</th>
                <th className="px-4 py-3 font-semibold">{t("audit.col_object")}</th>
                <th className="px-4 py-3 font-semibold">{t("audit.col_details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{dateLabel(row.created_at, locale)}</td>
                  <td className="px-4 py-3">{row.actor_name || row.actor_email || "—"}</td>
                  <td className="px-4 py-3 font-medium">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.object_type} {row.object_id}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-muted">
                    {row.metadata ? JSON.stringify(row.metadata) : "—"}
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
