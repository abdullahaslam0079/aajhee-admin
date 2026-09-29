"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { Badge, Button, ConfirmDialog, Cover, Empty, ErrorBox, Field, PageHeader, Skeleton, StatCard, inputClass } from "@/components/ui";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DealSourcesPanel } from "@/components/DealSourcesPanel";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { OFFERS_ENABLED } from "@/lib/flags";
import { branchAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { canWrite, useAuth } from "@/lib/useAuth";
import type { AdminBranch, AdminBusiness, Paginated, VerificationStatus } from "@/lib/types";

type Listing = {
  id: number;
  name: string;
  base_price: string;
  effective_price?: string;
  has_discount?: boolean;
  is_enabled?: boolean;
  category_name?: string;
};

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

export default function BusinessDetailPage({ params }: PageProps<"/businesses/[id]">) {
  const { id } = use(params);
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { admin } = useAuth();
  const writable = canWrite(admin, "businesses");
  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const [cnicUrl, setCnicUrl] = useState<string | null>(null);
  const [shopUrl, setShopUrl] = useState<string | null>(null);

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
      .then(async ([biz, branchData, productData]) => {
        setBusiness(biz);
        setBranches(pageResults(branchData));
        setListings(pageResults(productData as Paginated<Listing>) || (Array.isArray(productData) ? productData : []));
        const [cnic, shop] = await Promise.all([
          biz.has_cnic_image || biz.verification_checklist?.cnic_image
            ? api<{ url: string }>(`/api/admin/businesses/${id}/private-media/cnic_image`, { auth: true }).catch(() => null)
            : Promise.resolve(null),
          biz.has_shop_photo
            ? api<{ url: string }>(`/api/admin/businesses/${id}/private-media/shop_photo`, { auth: true }).catch(() => null)
            : Promise.resolve(null),
        ]);
        setCnicUrl(cnic?.url || null);
        setShopUrl(shop?.url || null);
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

  async function approveMerchant() {
    setBusy(true);
    try {
      await api(`/api/admin/businesses/${id}/verify`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action: "approve" }),
      });
      toast.push("Merchant verified — store can appear to customers");
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not approve merchant"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function rejectMerchant() {
    if (!rejectReason.trim()) {
      toast.push("Reject reason is required", "error");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/admin/businesses/${id}/verify`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action: "reject", reason: rejectReason.trim() }),
      });
      toast.push("Merchant kept under review — email sent");
      setRejectOpen(false);
      setRejectReason("");
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not reject merchant"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function setVerification(next: VerificationStatus) {
    if (next === "suspended") {
      setSuspendConfirm(true);
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("verification_status", next);
      const updated = await api<AdminBusiness & { message?: string }>(
        `/api/admin/businesses/${id}`,
        { method: "PATCH", auth: true, body: data },
      );
      setBusiness(updated);
      toast.push(
        next === "verified"
          ? "Merchant verified — store can appear to customers"
          : "Merchant set back to under review",
      );
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not update verification"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSuspend() {
    setSuspendConfirm(false);
    setBusy(true);
    try {
      const data = new FormData();
      data.set("verification_status", "suspended");
      await api(`/api/admin/businesses/${id}`, { method: "PATCH", auth: true, body: data });
      toast.push("Merchant suspended — store hidden from customers");
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not suspend merchant"), "error");
    } finally {
      setBusy(false);
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
          <div className="flex flex-wrap gap-2">
            {writable && business.verification_status !== "verified" ? (
              <Button type="button" disabled={busy} onClick={() => void approveMerchant()}>
                Approve
              </Button>
            ) : null}
            {writable && business.verification_status !== "verified" ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            ) : null}
            {writable && business.verification_status !== "suspended" ? (
              <Button type="button" variant="danger" disabled={busy} onClick={() => void setVerification("suspended")}>
                Suspend
              </Button>
            ) : null}
            {writable && business.verification_status === "verified" ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void setVerification("under_review")}
              >
                Mark under review
              </Button>
            ) : null}
            {writable ? (
              <Link href={`/businesses/${id}/edit`}>
                <Button type="button" variant="ghost">{t("common.edit")}</Button>
              </Link>
            ) : null}
            {writable ? (
              <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
                {t("common.delete")}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Cover src={business.logo_url} label={business.name} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {t("businesses.owner")}: {business.owner_email || business.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={statusTone(business.verification_status)}>
              {statusLabel(business.verification_status)}
            </Badge>
            {business.is_paused ? <Badge tone="warning">Shop paused</Badge> : null}
            {business.is_customer_visible ? (
              <Badge tone="success">Visible to customers</Badge>
            ) : (
              <Badge tone="warning">Hidden from customers</Badge>
            )}
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
            {business.owner_is_active === false ? (
              <Badge tone="danger">{t("businesses.owner_disabled")}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <section className="card mb-8 space-y-4 p-5">
        <h2 className="text-lg font-semibold">Verification & contact</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {(
            business.verification_checklist
              ? [
                  ["Phone", Boolean(business.verification_checklist.phone)],
                  ["WhatsApp / alerts", Boolean(business.verification_checklist.notification_whatsapp)],
                  ["CNIC", Boolean(business.verification_checklist.cnic_image)],
                  ["Shop photo or Instagram", Boolean(business.verification_checklist.shop_photo_or_instagram)],
                ]
              : [
                  ["Phone", Boolean(business.phone)],
                  ["WhatsApp / alerts", Boolean(business.notification_whatsapp)],
                  ["CNIC", Boolean(business.cnic_image_url)],
                  ["Shop photo or Instagram", Boolean(business.shop_photo_url || business.instagram_url)],
                ]
          ).map(([label, ok]) => (
            <li key={String(label)} className="flex items-center gap-2">
              <span className={ok ? "text-emerald-500" : "text-amber-500"}>{ok ? "✓" : "○"}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Phone</p>
            <p className="mt-1 text-sm">{business.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">WhatsApp / alerts</p>
            <p className="mt-1 text-sm">{business.notification_whatsapp || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Instagram</p>
            {business.instagram_url ? (
              <a
                href={business.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-deal"
              >
                {business.instagram_url}
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted">—</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">CNIC</p>
            {cnicUrl ? (
              <a href={cnicUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cnicUrl}
                  alt="CNIC"
                  className="max-h-48 rounded-xl border border-line object-contain"
                />
              </a>
            ) : (
              <p className="text-sm text-muted">No CNIC uploaded</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Shop photo</p>
            {shopUrl ? (
              <a href={shopUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shopUrl}
                  alt="Shop"
                  className="max-h-48 rounded-xl border border-line object-contain"
                />
              </a>
            ) : (
              <p className="text-sm text-muted">No shop photo uploaded</p>
            )}
          </div>
        </div>
      </section>

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
        <div className="card mb-8 divide-y divide-line">
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

      {OFFERS_ENABLED ? (
        <div className="mt-8">
          <DealSourcesPanel businessId={Number(id)} />
        </div>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t("businesses.delete_title")}
          message="Soft-delete this business? It will be hidden from customers; order history is kept."
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      ) : null}
      {suspendConfirm ? (
        <ConfirmDialog
          title="Suspend merchant"
          message="Suspend this business? It will be hidden from customers until re-verified."
          confirmLabel="Suspend"
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setSuspendConfirm(false)}
          onConfirm={() => void confirmSuspend()}
        />
      ) : null}
      {rejectOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-3 p-5">
            <h2 className="text-lg font-semibold">Reject merchant</h2>
            <Field label="Reason (required)">
              <textarea
                className={`${inputClass} min-h-24`}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRejectOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => void rejectMerchant()}>
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
