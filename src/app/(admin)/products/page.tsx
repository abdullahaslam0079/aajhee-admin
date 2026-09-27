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
  PageHeader,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { rs } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
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
  const router = useRouter();
  const toast = useToast();
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
      .catch((err) => setError(errorMessage(err, "Failed to load listings")))
      .finally(() => setLoading(false));
  }, [q, enabledFilter, lowStockFilter, businessId, page]);

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
      setError("Enter a discount between 0.01 and 100.");
      return;
    }
    if (!allProducts && selected.length === 0) {
      setError("Select at least one listing, or apply to all.");
      return;
    }
    if (allProducts && !businessId) {
      const ok = window.confirm(
        `Apply ${percentValue}% off to every listing on the platform? Pick a business first to limit the scope.`,
      );
      if (!ok) return;
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
        }),
      });
      toast.push(`Discount applied to ${result?.updated ?? (allProducts ? "all" : selected.length)} listing(s)`);
      setSelected([]);
      load();
    } catch (err) {
      setError(errorMessage(err, "Could not apply bulk discount"));
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Listings"
        subtitle={
          count
            ? `Showing ${from}–${to} of ${count} · photos, price, stock, and discounts`
            : "Product catalog for ordering — photos, price, stock, and optional discounts"
        }
        actions={
          <Link href="/products/new">
            <Button type="button">Create listing</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={`${inputClass} min-w-[220px] flex-1`}
          placeholder="Search listings or business…"
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
          aria-label="Business"
        >
          <option value="">All businesses</option>
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
          aria-label="Visibility"
        >
          <option value="">All visibility</option>
          <option value="true">Active only</option>
          <option value="false">Off only</option>
        </select>
        <select
          className={`${inputClass} w-auto`}
          value={lowStockFilter}
          onChange={(e) => {
            setLowStockFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Stock"
        >
          <option value="">All stock</option>
          <option value="true">Low stock (≤{LOW_STOCK_THRESHOLD})</option>
        </select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      {items.length > 0 ? (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold">
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectPage} />
            Select page ({selected.length} selected)
          </label>
          <Field label="Bulk discount %">
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
            {bulkBusy ? "Applying…" : "Apply to selected"}
          </Button>
          <Button type="button" variant="ghost" disabled={bulkBusy} onClick={() => void applyBulkDiscount(true)}>
            {businessId ? "Apply to all in business" : "Apply to all listings"}
          </Button>
          {selected.length ? (
            <button
              type="button"
              className="pb-2.5 text-xs font-semibold text-muted hover:text-ink"
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          ) : null}
        </div>
      ) : null}

      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title="No listings"
          body={hasFilters ? "No listings match these filters." : "Create a product listing with photos and a price."}
          action={
            hasFilters ? undefined : (
              <Link href="/products/new">
                <Button type="button">Create listing</Button>
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
                <th>Name</th>
                <th>Business</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/products/${p.id}/edit`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Cover src={p.image_url} label={p.name} className="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {p.has_discount ? <Badge tone="deal">On sale</Badge> : null}
                          {p.is_available === false ? <Badge tone="warning">Unavailable</Badge> : null}
                          {p.is_low_stock ? (
                            <Badge tone={p.stock_quantity === 0 ? "danger" : "warning"}>
                              {p.stock_quantity === 0 ? "Out of stock" : `Low stock · ${p.stock_quantity}`}
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
                    {p.stock_quantity == null ? <span className="text-muted">Unlimited</span> : p.stock_quantity}
                  </td>
                  <td>
                    <Badge tone={p.is_enabled === false ? "neutral" : "success"}>
                      {p.is_enabled === false ? "Off" : "Active"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="text-sm font-semibold text-deal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
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
        showingLabel={`Showing ${from}–${to} of ${count}`}
        previousLabel="Previous"
        nextLabel="Next"
      />
    </div>
  );
}
