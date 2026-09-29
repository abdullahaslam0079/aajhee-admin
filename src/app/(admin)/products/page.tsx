"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { LOW_STOCK_THRESHOLD, type AdminProduct } from "@/components/ProductForm";
import {
  Badge,
  Button,
  Cover,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { rs } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { canWriteAdmin } from "@/lib/roles";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/useAuth";
import type { AdminBusiness, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  // useSearchParams needs a Suspense boundary for prerendering.
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <ProductsList />
    </Suspense>
  );
}

function ProductsList() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { admin } = useAuth();
  const canWrite = canWriteAdmin(admin, "other");
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(
    searchParams.get("stock") === "low" || searchParams.get("low_stock") === "true" ? "true" : "",
  );
  const [businessId, setBusinessId] = useState(searchParams.get("business_id") || "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminProduct> | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkPercent, setBulkPercent] = useState("10");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const q = useDebounced(search.trim());

  const load = useCallback(() => {
    api<Paginated<AdminProduct> | AdminProduct[]>("/api/admin/products", {
      auth: true,
      query: {
        search: q || undefined,
        is_enabled: enabledFilter || undefined,
        low_stock: lowStockFilter || undefined,
        business_id: businessId || undefined,
        page,
        page_size: PAGE_SIZE,
      },
    })
      .then((payload) => {
        if (Array.isArray(payload)) {
          setData({ count: payload.length, page: 1, page_size: PAGE_SIZE, results: payload });
        } else {
          setData(payload);
        }
        setError("");
      })
      .catch((err) => setError(errorMessage(err, t("products.load_error"))))
      .finally(() => setLoading(false));
  }, [q, enabledFilter, lowStockFilter, businessId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<Paginated<AdminBusiness> | AdminBusiness[]>("/api/admin/businesses", {
      auth: true,
      query: { page_size: 200 },
    })
      .then((payload) => setBusinesses(pageResults(payload)))
      .catch(() => undefined);
  }, []);

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const hasFilters = Boolean(q || enabledFilter || lowStockFilter || businessId);
  const pageIds = items.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectPage() {
    if (allOnPageSelected) setSelected((prev) => prev.filter((id) => !pageIds.includes(id)));
    else setSelected((prev) => Array.from(new Set([...prev, ...pageIds])));
  }

  async function applyBulkDiscount(allProducts = false) {
    const percentValue = Number(bulkPercent);
    if (!Number.isFinite(percentValue) || percentValue <= 0 || percentValue > 100) {
      setError(t("products.bulk_percent_invalid"));
      return;
    }
    if (!allProducts && selected.length === 0) {
      setError(t("products.bulk_need_selection"));
      return;
    }
    if (allProducts && !businessId) {
      setError(t("products.bulk_need_business"));
      return;
    }
    if (allProducts && confirmText.trim() !== "CONFIRM") {
      setError(t("products.bulk_confirm_required"));
      return;
    }
    setBulkBusy(true);
    setError("");
    try {
      const result = await api<{ updated?: number }>("/api/admin/products/bulk-discount", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          discount_percent: percentValue,
          product_ids: allProducts ? [] : selected,
          all_products: allProducts,
          business_id: allProducts && businessId ? Number(businessId) : undefined,
          confirm: allProducts ? "CONFIRM" : undefined,
        }),
      });
      toast.push(t("products.bulk_ok", { count: result?.updated ?? (allProducts ? count : selected.length) }));
      setSelected([]);
      setConfirmApplyAll(false);
      setConfirmText("");
      load();
    } catch (err) {
      setError(errorMessage(err, t("products.bulk_error")));
    } finally {
      setBulkBusy(false);
    }
  }

  function openApplyAll() {
    if (!businessId) {
      setError(t("products.bulk_need_business"));
      return;
    }
    setError("");
    setConfirmText("");
    setConfirmApplyAll(true);
  }

  const selectedBusinessName =
    businesses.find((b) => String(b.id) === String(businessId))?.name || "selected business";

  return (
    <div>
      <PageHeader
        title={t("products.title")}
        subtitle={
          count
            ? t("products.showing", { from, to, count })
            : t("products.subtitle")
        }
        actions={
          canWrite ? (
            <Link href="/products/new">
              <Button type="button">{t("products.add")}</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={`${inputClass} min-w-[220px] flex-1`}
          placeholder={t("products.search_hint")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={`${inputClass} w-auto min-w-[180px]`}
          value={businessId}
          onChange={(e) => {
            setBusinessId(e.target.value);
            setPage(1);
          }}
          aria-label={t("products.col_business")}
        >
          <option value="">{t("products.all_businesses")}</option>
          {businesses.map((biz) => (
            <option key={biz.id} value={biz.id}>
              {biz.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={enabledFilter}
          onChange={(e) => {
            setEnabledFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t("products.col_status")}
        >
          <option value="">{t("products.all_visibility")}</option>
          <option value="true">{t("products.active_only")}</option>
          <option value="false">{t("products.off_only")}</option>
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={lowStockFilter}
          onChange={(e) => {
            setLowStockFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t("products.col_stock")}
        >
          <option value="">{t("products.all_stock")}</option>
          <option value="true">{t("products.low_stock", { n: LOW_STOCK_THRESHOLD })}</option>
        </select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      {canWrite && items.length > 0 ? (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold">
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectPage} />
            {t("products.select_page", { n: selected.length })}
          </label>
          <Field label={t("products.bulk_discount")}>
            <input
              className={`${inputClass} w-28`}
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            disabled={bulkBusy || selected.length === 0}
            onClick={() => void applyBulkDiscount(false)}
          >
            {bulkBusy ? t("products.applying") : t("products.apply_selected")}
          </Button>
          <Button type="button" variant="ghost" disabled={bulkBusy} onClick={openApplyAll}>
            {t("products.apply_business")}
          </Button>
          {selected.length ? (
            <button
              type="button"
              className="pb-2.5 text-xs font-semibold text-muted hover:text-ink"
              onClick={() => setSelected([])}
            >
              {t("products.clear_selection")}
            </button>
          ) : null}
        </div>
      ) : null}

      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={t("products.empty_title")}
          body={hasFilters ? t("products.empty_filtered") : t("products.empty_subtitle")}
          action={
            hasFilters || !canWrite ? undefined : (
              <Link href="/products/new">
                <Button type="button">{t("products.add")}</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-8" />
                <th>{t("products.col_name")}</th>
                <th>{t("products.col_business")}</th>
                <th>{t("products.col_category")}</th>
                <th>{t("products.col_price")}</th>
                <th>{t("products.col_stock")}</th>
                <th>{t("products.col_status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className={canWrite ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (canWrite) router.push(`/products/${p.id}/edit`);
                  }}
                >
                  {canWrite ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={p.name}
                      />
                    </td>
                  ) : (
                    <td />
                  )}
                  <td>
                    <div className="flex items-center gap-3">
                      <Cover src={p.image_url} label={p.name} className="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {p.has_discount ? <Badge tone="deal">{t("products.on_sale")}</Badge> : null}
                          {p.is_available === false ? <Badge tone="warning">{t("products.unavailable")}</Badge> : null}
                          {p.is_low_stock ? (
                            <Badge tone={p.stock_quantity === 0 ? "danger" : "warning"}>
                              {p.stock_quantity === 0
                                ? t("products.out_of_stock")
                                : t("products.low_stock_badge", { n: p.stock_quantity ?? 0 })}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{p.business_name || "—"}</td>
                  <td className="text-muted">{p.category_name || "—"}</td>
                  <td className="whitespace-nowrap">
                    {p.has_discount ? (
                      <>
                        <span className="font-semibold">{rs(p.effective_price)}</span>
                        <div className="text-xs text-muted line-through">{rs(p.base_price)}</div>
                      </>
                    ) : (
                      rs(p.base_price)
                    )}
                  </td>
                  <td className={p.is_low_stock ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>
                    {p.stock_quantity == null ? <span className="text-muted">{t("products.unlimited")}</span> : p.stock_quantity}
                  </td>
                  <td>
                    <Badge tone={p.is_enabled === false ? "neutral" : "success"}>
                      {p.is_enabled === false ? t("products.status_off") : t("products.status_active")}
                    </Badge>
                  </td>
                  <td className="text-right">
                    {canWrite ? (
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="text-sm font-semibold text-deal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("common.edit")}
                      </Link>
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

      {confirmApplyAll ? (
        <Modal
          title={t("products.apply_business")}
          onClose={() => {
            setConfirmApplyAll(false);
            setConfirmText("");
          }}
        >
          <p className="mb-3 text-sm text-muted">
            {t("products.bulk_confirm_message", {
              count,
              percent: bulkPercent,
              business: selectedBusinessName,
            })}
          </p>
          <Field label={t("products.bulk_confirm_label")} hint={t("products.bulk_confirm_hint")}>
            <input
              className={inputClass}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONFIRM"
              autoComplete="off"
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConfirmApplyAll(false);
                setConfirmText("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={bulkBusy || confirmText.trim() !== "CONFIRM"}
              onClick={() => void applyBulkDiscount(true)}
            >
              {bulkBusy ? t("products.applying") : t("products.apply_business")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
