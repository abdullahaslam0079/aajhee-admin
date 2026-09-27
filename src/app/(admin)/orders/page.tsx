"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  PageHeader,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import {
  ORDER_STATUS_OPTIONS,
  STATUS_ACTION_LABELS,
  formatDateTime,
  labelFulfillment,
  labelPayment,
  labelStatus,
  nextActions,
  statusTone,
} from "@/lib/commerce";
import { errorMessage } from "@/lib/errors";
import { rs } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, AdminOrder, OrderStatus, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

export default function OrdersPage() {
  // useSearchParams needs a Suspense boundary for prerendering.
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <OrdersList />
    </Suspense>
  );
}

function OrdersList() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "";
  const businessId = searchParams.get("business_id") || "";
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminOrder> | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const q = useDebounced(search.trim());

  function patchQuery(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(qs ? `/orders?${qs}` : "/orders");
    setPage(1);
  }

  const load = useCallback(() => {
    api<Paginated<AdminOrder> | AdminOrder[]>("/api/admin/orders", {
      auth: true,
      query: {
        status: status || undefined,
        business_id: businessId || undefined,
        search: q || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
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
        setUpdatedAt(new Date());
      })
      .catch((err) => setError(errorMessage(err, t("orders.load_error"))))
      .finally(() => setLoading(false));
  }, [status, businessId, q, dateFrom, dateTo, page, t]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
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
  const hasFilters = Boolean(status || businessId || q || dateFrom || dateTo);

  async function setOrderStatus(order: AdminOrder, next: OrderStatus) {
    if (next === "cancelled") {
      // Cancelling needs a reason prompt — do it on the detail page.
      router.push(`/orders/${order.public_id}`);
      return;
    }
    setBusyId(order.public_id);
    setError("");
    try {
      await api(`/api/admin/orders/${order.public_id}/status`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ status: next }),
      });
      toast.push(`Order #${order.public_id.slice(0, 8)} → ${labelStatus(next, t)}`);
      load();
    } catch (err) {
      setError(errorMessage(err, "Could not update order status"));
    } finally {
      setBusyId("");
    }
  }

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    router.replace("/orders");
  }

  function exportCsv() {
    downloadCsv(
      `aajhee-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("orders.col_id"),
        t("orders.col_business"),
        t("orders.col_customer"),
        t("orders.col_status"),
        "Fulfillment",
        "Payment",
        t("orders.col_total"),
        t("orders.col_placed"),
      ],
      items.map((order) => [
        order.public_id,
        order.business_name,
        order.customer_name || order.customer_phone || order.customer_email || "",
        labelStatus(order.status, t),
        labelFulfillment(order.fulfillment_type, t),
        labelPayment(order.payment_method, t),
        order.total,
        order.placed_at,
      ]),
    );
    toast.push(t("orders.exported"));
  }

  return (
    <div>
      <PageHeader
        title={t("orders.title")}
        subtitle={
          updatedAt
            ? t("orders.subtitle_live", { time: updatedAt.toLocaleTimeString() })
            : t("orders.subtitle")
        }
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={!items.length} onClick={exportCsv}>
              {t("orders.export_csv")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => load()}>
              {t("orders.refresh")}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={`${inputClass} min-w-[220px] flex-1`}
          placeholder={t("orders.search_hint")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={`${inputClass} w-auto min-w-[160px]`}
          value={status}
          onChange={(e) => patchQuery({ status: e.target.value })}
          aria-label={t("orders.col_status")}
        >
          <option value="">{t("orders.all_statuses")}</option>
          {ORDER_STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {labelStatus(value, t)}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} w-auto min-w-[180px]`}
          value={businessId}
          onChange={(e) => patchQuery({ business_id: e.target.value })}
          aria-label={t("orders.col_business")}
        >
          <option value="">{t("orders.all_businesses")}</option>
          {businesses.map((biz) => (
            <option key={biz.id} value={biz.id}>
              {biz.name}
            </option>
          ))}
        </select>
        <input
          className={`${inputClass} w-auto`}
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          aria-label="From date"
        />
        <input
          className={`${inputClass} w-auto`}
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          aria-label="To date"
        />
        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty
          title={t("orders.empty_title")}
          body={hasFilters ? t("orders.empty_filtered") : t("orders.subtitle")}
        />
      ) : (
        <div className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("orders.col_id")}</th>
                <th>{t("orders.col_business")}</th>
                <th>{t("orders.col_customer")}</th>
                <th>{t("orders.col_status")}</th>
                <th>Fulfillment</th>
                <th>{t("orders.col_total")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((order) => {
                const actions = nextActions(order);
                const busy = busyId === order.public_id;
                return (
                  <tr
                    key={order.public_id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/orders/${order.public_id}`)}
                  >
                    <td>
                      <Link
                        href={`/orders/${order.public_id}`}
                        className="font-mono text-xs font-semibold hover:text-deal"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{order.public_id.slice(0, 8)}
                      </Link>
                      <div className="text-xs text-muted">{formatDateTime(order.placed_at)}</div>
                      {order.items?.length ? (
                        <div className="mt-0.5 max-w-[240px] truncate text-xs text-muted">
                          {order.items
                            .slice(0, 2)
                            .map((item) => `${item.quantity}× ${item.product_name}`)
                            .join(" · ")}
                          {order.items.length > 2 ? ` · +${order.items.length - 2} more` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <p className="font-semibold">{order.business_name}</p>
                      <div className="text-xs text-muted">{order.branch_name}</div>
                    </td>
                    <td>
                      <p>{order.customer_name || <span className="text-muted">Customer</span>}</p>
                      {order.customer_phone ? (
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-xs text-deal hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.customer_phone}
                        </a>
                      ) : (
                        <div className="text-xs text-muted">No phone</div>
                      )}
                    </td>
                    <td>
                      <Badge tone={statusTone(order.status)}>{labelStatus(order.status, t)}</Badge>
                    </td>
                    <td>
                      {labelFulfillment(order.fulfillment_type)}
                      <div className="text-xs text-muted">{labelPayment(order.payment_method)}</div>
                    </td>
                    <td className="font-semibold whitespace-nowrap">{rs(order.total)}</td>
                    <td className="text-right">
                      <div
                        className="flex flex-wrap justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actions.map((next) => (
                          <button
                            key={next}
                            type="button"
                            disabled={busy}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                              next === "cancelled"
                                ? "ring-1 ring-line hover:bg-paper"
                                : "bg-deal-deep text-white hover:bg-deal"
                            }`}
                            onClick={() => void setOrderStatus(order, next)}
                          >
                            {STATUS_ACTION_LABELS[next] || labelStatus(next, t)}
                          </button>
                        ))}
                        <Link
                          href={`/orders/${order.public_id}`}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-deal hover:bg-paper"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
