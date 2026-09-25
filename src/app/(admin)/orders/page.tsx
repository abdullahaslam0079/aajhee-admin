"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { Paginated } from "@/lib/types";

type Order = {
  id: number;
  public_id: string;
  business_name?: string;
  branch_name?: string;
  status: string;
  fulfillment_type: string;
  payment_method: string;
  total: string;
  placed_at: string;
};

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<Order> | Order[]>("/api/admin/orders", { auth: true })
      .then((data) =>
        setItems(pageResults(data as Paginated<Order>) || (Array.isArray(data) ? data : [])),
      )
      .catch((err) => setError(errorMessage(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Platform order oversight" />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Empty title="No orders yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--muted)]/40">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.public_id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono text-xs">{o.public_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    {o.business_name}
                    <div className="text-xs text-[var(--muted-foreground)]">{o.branch_name}</div>
                  </td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">
                    {o.fulfillment_type}
                    <div className="text-xs text-[var(--muted-foreground)]">{o.payment_method}</div>
                  </td>
                  <td className="px-4 py-3">{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
