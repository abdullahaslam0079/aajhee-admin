"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Cover, Empty, ErrorBox, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { compact } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

export default function BusinessesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminBusiness> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const q = useDebounced(search);

  const load = useCallback(() => {
    api<Paginated<AdminBusiness>>("/api/admin/businesses", {
      auth: true,
      query: { search: q, page, page_size: PAGE_SIZE },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("businesses.load_error"))))
      .finally(() => setLoading(false));
  }, [q, page, t]);

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

  return (
    <div>
      <PageHeader
        title={t("businesses.title")}
        subtitle={count ? t("common.showing", { from, to, count }) : undefined}
        actions={
          <Link href="/businesses/new">
            <Button type="button">{t("businesses.add")}</Button>
          </Link>
        }
      />
      <input
        className={`${inputClass} mb-4 max-w-md`}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={t("businesses.search_hint")}
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={t("businesses.empty_title")}
          body={t("businesses.empty_subtitle")}
          action={
            <Link href="/businesses/new">
              <Button type="button">{t("businesses.add")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("businesses.name")}</th>
                <th>{t("businesses.category")}</th>
                <th>{t("businesses.owner")}</th>
                <th>{t("businesses.branches")}</th>
                <th>{t("businesses.offers")}</th>
                <th>{t("businesses.scans")}</th>
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
                        {biz.owner_is_active === false ? <Badge tone="danger">{t("businesses.owner_disabled")}</Badge> : null}
                      </div>
                    </div>
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
                  <td>{biz.offer_count ?? 0}</td>
                  <td>{compact(biz.scan_count)}</td>
                  <td className="text-right">
                    <Link href={`/businesses/${biz.id}/edit`} className="text-sm font-semibold text-deal" onClick={(e) => e.stopPropagation()}>
                      {t("common.edit")}
                    </Link>
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
