"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, ConfirmDialog, Cover, Empty, ErrorBox, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { OFFERS_ENABLED } from "@/lib/flags";
import { compact } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { canWriteAdmin } from "@/lib/roles";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/useAuth";
import type { AdminBusiness, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "under_review", label: "Under review" },
  { value: "verified", label: "Verified" },
  { value: "suspended", label: "Suspended" },
];

function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "verified") return "success";
  if (status === "suspended") return "danger";
  if (status === "under_review") return "warning";
  return "neutral";
}

function statusLabel(status?: string) {
  if (status === "verified") return "Verified";
  if (status === "suspended") return "Suspended";
  if (status === "under_review") return "Under review";
  return status || "—";
}

export default function BusinessesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { admin } = useAuth();
  const canWrite = canWriteAdmin(admin, "other");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminBusiness> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [suspendTarget, setSuspendTarget] = useState<AdminBusiness | null>(null);
  const q = useDebounced(search);

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<AdminBusiness>>("/api/admin/businesses", {
      auth: true,
      query: {
        search: q,
        page,
        page_size: PAGE_SIZE,
        verification_status: status || undefined,
      },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("businesses.load_error"))))
      .finally(() => setLoading(false));
  }, [q, page, status, t]);

  useEffect(() => {
    load();
  }, [load]);

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  async function copyEmail(email?: string) {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    toast.push(t("common.copied"));
  }

  async function approve(biz: AdminBusiness, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api(`/api/admin/businesses/${biz.id}/verify`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action: "approve" }),
      });
      toast.push(`${biz.name} approved`);
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not approve merchant"), "error");
    }
  }

  async function suspendConfirmed() {
    if (!suspendTarget) return;
    try {
      const data = new FormData();
      data.set("verification_status", "suspended");
      await api(`/api/admin/businesses/${suspendTarget.id}`, { method: "PATCH", auth: true, body: data });
      toast.push(`${suspendTarget.name} suspended`);
      setSuspendTarget(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not suspend merchant"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title={t("businesses.title")}
        subtitle={count ? t("common.showing", { from, to, count }) : undefined}
        actions={
          canWrite ? (
            <Link href="/businesses/new">
              <Button type="button">{t("businesses.add")}</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={`${inputClass} max-w-md flex-1`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("businesses.search_hint")}
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                status === filter.value
                  ? "bg-deal text-white"
                  : "border border-line hover:bg-paper"
              }`}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={t("businesses.empty_title")}
          body={
            status === "under_review"
              ? "No merchants waiting for verification."
              : t("businesses.empty_subtitle")
          }
          action={
            canWrite ? (
              <Link href="/businesses/new">
                <Button type="button">{t("businesses.add")}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("businesses.name")}</th>
                <th>Status</th>
                <th>{t("businesses.category")}</th>
                <th>{t("businesses.owner")}</th>
                <th>{t("businesses.branches")}</th>
                {OFFERS_ENABLED ? (
                  <>
                    <th>{t("businesses.offers")}</th>
                    <th>{t("businesses.scans")}</th>
                  </>
                ) : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((biz) => (
                <tr key={biz.id} className="cursor-pointer" onClick={() => router.push(`/businesses/${biz.id}`)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Cover src={biz.logo_url} label={biz.name} className="h-9 w-9" />
                      <div>
                        <p className="font-semibold">{biz.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {biz.is_paused ? <Badge tone="warning">Paused</Badge> : null}
                          {biz.owner_is_active === false ? (
                            <Badge tone="danger">{t("businesses.owner_disabled")}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={statusTone(biz.verification_status)}>
                      {statusLabel(biz.verification_status)}
                    </Badge>
                  </td>
                  <td className="text-muted">{biz.category_name || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="text-left text-muted hover:text-ink"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyEmail(biz.owner_email || biz.email);
                      }}
                    >
                      {biz.owner_email || biz.email}
                    </button>
                  </td>
                  <td>{biz.branch_count ?? 0}</td>
                  {OFFERS_ENABLED ? (
                    <>
                      <td>{biz.offer_count ?? 0}</td>
                      <td>{compact(biz.scan_count)}</td>
                    </>
                  ) : null}
                  <td className="text-right">
                    {canWrite ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {biz.verification_status !== "verified" ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                            onClick={(e) => void approve(biz, e)}
                          >
                            Approve
                          </button>
                        ) : null}
                        {biz.verification_status !== "suspended" ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-red-600 hover:underline dark:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSuspendTarget(biz);
                            }}
                          >
                            Suspend
                          </button>
                        ) : null}
                        <Link
                          href={`/businesses/${biz.id}/edit`}
                          className="text-sm font-semibold text-deal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("common.edit")}
                        </Link>
                      </div>
                    ) : null}
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
      {suspendTarget ? (
        <ConfirmDialog
          title="Suspend merchant?"
          message={`Suspend ${suspendTarget.name}? The store will be hidden from customers until verified again.`}
          confirmLabel="Suspend"
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={() => void suspendConfirmed()}
          onCancel={() => setSuspendTarget(null)}
        />
      ) : null}
    </div>
  );
}
