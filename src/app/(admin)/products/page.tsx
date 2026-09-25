"use client";

import { useCallback, useEffect, useState } from "react";
import { Empty, ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { Paginated } from "@/lib/types";

type Product = {
  id: number;
  name: string;
  business_name?: string;
  category_name?: string;
  base_price: string;
  sale_price?: string | null;
  has_discount?: boolean;
  effective_price?: string;
  is_enabled?: boolean;
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<Product> | Product[]>("/api/admin/products", { auth: true })
      .then((data) => setItems(pageResults(data as Paginated<Product>) || (Array.isArray(data) ? data : [])))
      .catch((err) => setError(errorMessage(err, "Failed to load products")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Products" subtitle="Catalog migrated from offers" />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Empty title="No products yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--muted)]/40">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.business_name}</td>
                  <td className="px-4 py-3">{p.category_name}</td>
                  <td className="px-4 py-3">
                    {p.has_discount
                      ? `${p.effective_price} (was ${p.base_price})`
                      : p.base_price}
                  </td>
                  <td className="px-4 py-3">{p.is_enabled ? "Active" : "Off"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
