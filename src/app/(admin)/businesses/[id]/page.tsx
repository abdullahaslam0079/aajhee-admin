"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { Badge, Button, ConfirmDialog, Cover, Empty, ErrorBox, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { branchAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBranch, AdminBusiness, Paginated } from "@/lib/types";

type Listing = {
  id: number;
  name: string;
  base_price: string;
  effective_price?: string;
  has_discount?: boolean;
  is_enabled?: boolean;
  category_name?: string;
};

export default function BusinessDetailPage({ params }: PageProps<"/businesses/[id]">) {
  const { id } = use(params);
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api<AdminBusiness>(`/api/admin/businesses/${id}`, { auth: true }),
      api<{ results?: AdminBranch[] } | AdminBranch[]>(`/api/admin/businesses/${id}/branches`, {
        auth: true,
        query: { page_size: 100 },
      }),
      api<Paginated<Listing> | Listing[]>("/api/admin/products", {
        auth: true,
        query: { business_id: id, page_size: 100 },
      }),
    ])
      .then(([biz, branchData, productData]) => {
        setBusiness(biz);
        setBranches(pageResults(branchData));
        setListings(pageResults(productData as Paginated<Listing>) || (Array.isArray(productData) ? productData : []));
      })
      .catch((err) => setError(errorMessage(err, t("businesses.load_error"))));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    try {
      await api(`/api/admin/businesses/${id}`, { method: "DELETE", auth: true });
      toast.push(t("businesses.deleted"));
      router.push("/businesses");
    } catch (err) {
      toast.push(errorMessage(err, t("businesses.delete_error")), "error");
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!business) return <Skeleton className="h-40" />;

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: "/businesses", label: t("businesses.title") },
          { label: business.name },
        ]}
      />
      <PageHeader
        title={business.name}
        subtitle={business.category_name}
        actions={
          <div className="flex gap-2">
            <Link href={`/businesses/${id}/edit`}>
              <Button type="button" variant="ghost">{t("common.edit")}</Button>
            </Link>
            <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
              {t("common.delete")}
            </Button>
          </div>
        }
      />
      <div className="mb-6 flex items-center gap-4">
        <Cover src={business.logo_url} label={business.name} className="h-16 w-16" />
        <div>
          <p className="text-sm text-muted">{t("businesses.owner")}: {business.owner_email || business.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {business.presence_mode ? (
              <Badge tone="deal">
                {business.presence_mode === "online_only"
                  ? t("businesses.presence_online")
                  : business.presence_mode === "instore_only"
                    ? t("businesses.presence_instore")
                    : t("businesses.presence_hybrid")}
              </Badge>
            ) : null}
            {business.presence_mode !== "instore_only" && business.online_coverage ? (
              <Badge>
                {business.online_coverage === "country"
                  ? t("businesses.coverage_country")
                  : t("businesses.coverage_city")}
              </Badge>
            ) : null}
            {business.owner_is_active === false ? <Badge tone="danger">{t("businesses.owner_disabled")}</Badge> : null}
          </div>
        </div>
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <StatCard label={t("businesses.branches")} value={business.branch_count ?? branches.length} />
        <StatCard label="Listings" value={listings.length} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("businesses.branches_title")}</h2>
        <Link href={`/businesses/${id}/branches/new`}>
          <Button type="button" variant="ghost">{t("branches.add")}</Button>
        </Link>
      </div>
      {branches.length === 0 ? (
        <Empty title={t("branches.empty_title")} body={t("branches.empty_subtitle")} />
      ) : (
        <div className="card mb-8 divide-y divide-line">
          {branches.map((branch) => (
            <div key={branch.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{branch.name}</p>
                <p className="text-sm text-muted">{branchAddress(branch)}</p>
              </div>
              <Link href={`/businesses/${id}/branches/${branch.id}/edit`} className="text-sm font-semibold text-deal">
                {t("common.edit")}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listings</h2>
        <Link href={`/products/new?businessId=${id}`}>
          <Button type="button" variant="ghost">Create listing</Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <Empty title="No listings yet" body="Create a product listing with photos and a price for this business." />
      ) : (
        <div className="card divide-y divide-line">
          {listings.map((item) => (
            <Link
              key={item.id}
              href={`/products/${item.id}/edit`}
              className="flex items-center justify-between px-4 py-3 hover:bg-paper"
            >
              <div>
                <span className="font-medium">{item.name}</span>
                <p className="text-sm text-muted">
                  {item.category_name}
                  {item.category_name ? " · " : ""}
                  {item.has_discount ? `${item.effective_price} (was ${item.base_price})` : item.base_price}
                </p>
              </div>
              <Badge tone={item.is_enabled === false ? "warning" : "success"}>
                {item.is_enabled === false ? "Off" : "Active"}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {confirm ? (
        <ConfirmDialog
          title={t("businesses.delete_title")}
          message={t("businesses.delete_message")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
