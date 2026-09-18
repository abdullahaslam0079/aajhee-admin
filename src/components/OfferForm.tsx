"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, pageResults } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBranch, AdminBusiness, AdminOffer, OfferImportDraft, OfferType, UsageLimitType } from "@/lib/types";
import { Button, ErrorBox, Field, inputClass, Toggle } from "./ui";

const TYPES: OfferType[] = ["percentage_bill", "item", "deal"];
const LIMITS: UsageLimitType[] = [
  "one_time",
  "once_per_week",
  "once_per_month",
  "n_times_per_week",
  "n_times_per_month",
  "n_times_total",
];
const COUNT_LIMITS = new Set(["n_times_per_week", "n_times_per_month", "n_times_total"]);

type FormState = {
  business_id: string;
  title: string;
  description: string;
  detailed_description: string;
  offer_type: OfferType;
  discount_percent: string;
  item_name: string;
  original_price: string;
  discounted_price: string;
  included_items: string[];
  is_online: boolean;
  is_enabled: boolean;
  usage_limit_type: UsageLimitType;
  usage_limit_count: string;
  external_url: string;
  external_url_label: string;
  branch_ids: number[];
  is_time_limited: boolean;
  starts_at: string;
  ends_at: string;
  redemption_mode: string;
};

function emptyForm(businessId?: string): FormState {
  return {
    business_id: businessId || "",
    title: "",
    description: "",
    detailed_description: "",
    offer_type: "percentage_bill",
    discount_percent: "10",
    item_name: "",
    original_price: "",
    discounted_price: "",
    included_items: ["", ""],
    is_online: false,
    is_enabled: true,
    usage_limit_type: "one_time",
    usage_limit_count: "1",
    external_url: "",
    external_url_label: "",
    branch_ids: [],
    is_time_limited: false,
    starts_at: "",
    ends_at: "",
    redemption_mode: "view_only",
  };
}

function fromOffer(offer: AdminOffer): FormState {
  const branchIds = offer.branch_ids?.length
    ? offer.branch_ids
    : (offer.branches ?? []).map((b) => b.id);
  return {
    business_id: String(offer.business_id || ""),
    title: offer.title || "",
    description: offer.description || "",
    detailed_description: offer.detailed_description || "",
    offer_type: (offer.offer_type as OfferType) || "percentage_bill",
    discount_percent: String(offer.discount_percent ?? "10"),
    item_name: offer.item_name || "",
    original_price: offer.original_price != null ? String(offer.original_price) : "",
    discounted_price: offer.discounted_price != null ? String(offer.discounted_price) : "",
    included_items: offer.included_items?.length ? offer.included_items : ["", ""],
    is_online: Boolean(offer.is_online),
    is_enabled: offer.is_enabled !== false,
    usage_limit_type: (offer.usage_limit_type as UsageLimitType) || "one_time",
    usage_limit_count: String(offer.usage_limit_count ?? 1),
    external_url: offer.external_url || "",
    external_url_label: offer.external_url_label || "",
    branch_ids: branchIds,
    is_time_limited: Boolean(offer.is_time_limited),
    starts_at: toDateTimeLocal(offer.starts_at),
    ends_at: toDateTimeLocal(offer.ends_at),
    redemption_mode: offer.redemption_mode || (offer.is_online ? "view_only" : "scannable"),
  };
}

export function OfferForm({
  offer,
  initialBusinessId,
}: {
  offer?: AdminOffer;
  initialBusinessId?: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const editing = Boolean(offer);
  const [form, setForm] = useState<FormState>(offer ? fromOffer(offer) : emptyForm(initialBusinessId));
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(offer?.image_urls ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ results?: AdminBusiness[] } | AdminBusiness[]>("/api/admin/businesses", {
      auth: true,
      query: { page_size: 100 },
    }).then((data) => setBusinesses(pageResults(data)));
  }, []);

  useEffect(() => {
    if (!form.business_id) return;
    const businessId = form.business_id;
    api<{ results?: AdminBranch[] } | AdminBranch[]>(`/api/admin/businesses/${businessId}/branches`, {
      auth: true,
      query: { page_size: 100 },
    }).then((data) => {
      const list = pageResults(data);
      setBranches(list);
      setForm((current) => {
        if (current.business_id !== businessId) return current;
        if (current.branch_ids.length || editing) return current;
        return { ...current, branch_ids: list.map((b) => b.id) };
      });
    });
  }, [form.business_id, editing]);
  const visibleBranches = form.business_id ? branches : [];

  const defaultLabel = form.offer_type === "deal" ? t("offers.link_label_view_deal") : t("offers.link_label_view_offer");
  const typeLabel = (type: OfferType) =>
    type === "item" ? t("offers.type_item") : type === "deal" ? t("offers.type_deal") : t("offers.type_bill");
  const limitLabel = (limit: UsageLimitType) =>
    ({
      one_time: t("offers.limit_one_time"),
      once_per_week: t("offers.limit_once_week"),
      once_per_month: t("offers.limit_once_month"),
      n_times_per_week: t("offers.limit_n_times_week"),
      n_times_per_month: t("offers.limit_n_times_month"),
      n_times_total: t("offers.limit_n_times_total"),
    })[limit];

  const needsCount = COUNT_LIMITS.has(form.usage_limit_type);

  function applyImport(draft: OfferImportDraft) {
    setForm((current) => ({
      ...current,
      title: draft.title || current.title,
      description: draft.description || current.description,
      detailed_description: draft.detailed_description || current.detailed_description,
      original_price: draft.original_price != null ? String(draft.original_price) : current.original_price,
      external_url: draft.external_url || draft.source_url || current.external_url,
      external_url_label: draft.external_url_label || current.external_url_label,
      offer_type: (draft.suggested_offer_type as OfferType) || current.offer_type,
      discount_percent: draft.suggested_discount_percent != null
        ? String(draft.suggested_discount_percent)
        : current.discount_percent,
    }));
    if (draft.image_urls?.length) {
      setImageUrls((current) => [...new Set([...current, ...draft.image_urls!])]);
    }
    setWarnings(draft.warnings ?? []);
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError("");
    try {
      const draft = await api<OfferImportDraft>("/api/admin/offers/import-from-url", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      applyImport(draft);
      toast.push(t("offers.import_success"));
    } catch (err) {
      setError(errorMessage(err, t("offers.import_error")));
    } finally {
      setImporting(false);
    }
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    if (imageUrls.includes(url)) {
      toast.push(t("offers.image_url_duplicate"), "info");
      return;
    }
    setImageUrls((current) => [...current, url]);
    setImageUrl("");
  }

  const payloadJson = useMemo(() => {
    const body: Record<string, unknown> = {
      business_id: Number(form.business_id),
      title: form.title,
      description: form.description,
      detailed_description: form.detailed_description,
      offer_type: form.offer_type,
      is_online: form.is_online,
      is_enabled: form.is_enabled,
      usage_limit_type: form.usage_limit_type,
      usage_limit_count: Number(form.usage_limit_count || 1),
      branch_ids: form.is_online && form.branch_ids.length === 0 ? [] : form.branch_ids,
      redemption_mode: form.is_online ? "view_only" : form.redemption_mode,
      is_time_limited: form.is_time_limited,
      starts_at: form.is_time_limited ? fromDateTimeLocal(form.starts_at) : null,
      ends_at: form.is_time_limited ? fromDateTimeLocal(form.ends_at) : null,
    };
    if (form.external_url) body.external_url = form.external_url;
    if (form.external_url_label || defaultLabel) body.external_url_label = form.external_url_label || defaultLabel;
    if (form.offer_type === "percentage_bill") body.discount_percent = form.discount_percent;
    if (form.offer_type === "item") {
      body.item_name = form.item_name;
      body.original_price = form.original_price;
      body.discounted_price = form.discounted_price;
    }
    if (form.offer_type === "deal") {
      body.included_items = form.included_items.map((s) => s.trim()).filter(Boolean);
      body.discounted_price = form.discounted_price;
    }
    return body;
  }, [form, defaultLabel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.is_online && form.branch_ids.length === 0) {
      setError(t("offers.branch_or_online_required"));
      return;
    }
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const shouldMultipart = files.length > 0;
      let body: BodyInit;
      if (shouldMultipart) {
        const data = new FormData();
        Object.entries(payloadJson).forEach(([key, value]) => {
          if (value == null) return;
          if (Array.isArray(value)) {
            value.forEach((item) => data.append(key, String(item)));
          } else if (typeof value === "boolean") {
            data.set(key, value ? "true" : "false");
          } else {
            data.set(key, String(value));
          }
        });
        imageUrls.forEach((url) => data.append("gallery_image_urls", url));
        files.forEach((file) => data.append("images", file));
        body = data;
      } else {
        body = JSON.stringify({
          ...payloadJson,
          gallery_image_urls: imageUrls,
        });
      }
      if (editing && offer) {
        await api(`/api/admin/offers/${offer.id}`, { method: "PATCH", auth: true, body });
        toast.push(t("offers.saved"));
        router.push(`/offers/${offer.id}`);
      } else {
        const created = await api<AdminOffer>("/api/admin/offers", { method: "POST", auth: true, body });
        toast.push(t("offers.saved"));
        router.push(`/offers/${created.id}`);
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, t("offers.save_error")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      {error ? <ErrorBox message={error} /> : null}

      {!editing ? (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("offers.import_from_url")}</h2>
          <p className="text-sm text-muted">{t("offers.import_from_url_hint")}</p>
          <div className="flex gap-2">
            <input className={inputClass} value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://" />
            <Button type="button" variant="ghost" onClick={importFromUrl} disabled={importing}>
              {importing ? t("offers.import_loading") : t("offers.import_action")}
            </Button>
          </div>
          {warnings.length ? (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">{t("offers.import_warnings_title")}</p>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card space-y-4 p-5">
        <Field label={t("offers.field_business")} error={errors.business_id}>
          <select
            className={inputClass}
            value={form.business_id}
            disabled={editing || Boolean(initialBusinessId)}
            onChange={(e) => setForm({ ...form, business_id: e.target.value, branch_ids: [] })}
            required
          >
            <option value="">{t("offers.field_business_hint")}</option>
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>
                {biz.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("offers.field_title")} error={errors.title}>
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </Field>
        <Field label={t("offers.field_description")} error={errors.description}>
          <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label={t("offers.field_detailed_description")}>
          <textarea className={inputClass} rows={4} value={form.detailed_description} onChange={(e) => setForm({ ...form, detailed_description: e.target.value })} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">{t("offers.field_type")}</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, offer_type: type })}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                  form.offer_type === type ? "bg-deal-deep text-white ring-deal-deep" : "bg-surface text-ink ring-line"
                }`}
              >
                {typeLabel(type)}
              </button>
            ))}
          </div>
        </div>
        {form.offer_type === "percentage_bill" ? (
          <Field label={t("offers.field_discount")} error={errors.discount_percent}>
            <input className={inputClass} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
          </Field>
        ) : null}
        {form.offer_type === "item" ? (
          <>
            <Field label={t("offers.field_item_name")} error={errors.item_name}>
              <input className={inputClass} value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("offers.field_original_price")} error={errors.original_price}>
                <input className={inputClass} value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
              </Field>
              <Field label={t("offers.field_discounted_price")} error={errors.discounted_price}>
                <input className={inputClass} value={form.discounted_price} onChange={(e) => setForm({ ...form, discounted_price: e.target.value })} />
              </Field>
            </div>
          </>
        ) : null}
        {form.offer_type === "deal" ? (
          <>
            <div className="grid gap-2">
              {form.included_items.map((item, index) => (
                <Field key={index} label={t("offers.included_item_label", { n: index + 1 })}>
                  <input
                    className={inputClass}
                    value={item}
                    onChange={(e) => {
                      const next = [...form.included_items];
                      next[index] = e.target.value;
                      setForm({ ...form, included_items: next });
                    }}
                  />
                </Field>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm({ ...form, included_items: [...form.included_items, ""] })}
              >
                {t("offers.add_included_item")}
              </Button>
            </div>
            <Field label={t("offers.field_deal_price")} error={errors.discounted_price}>
              <input className={inputClass} value={form.discounted_price} onChange={(e) => setForm({ ...form, discounted_price: e.target.value })} />
            </Field>
          </>
        ) : null}
      </div>

      <div className="card space-y-4 p-5">
        <Field label={t("offers.field_images")} hint={t("offers.field_images_hint")}>
          <div className="flex gap-2">
            <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
            <Button type="button" variant="ghost" onClick={addImageUrl}>
              {t("offers.add_image_url")}
            </Button>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-2 text-sm"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </Field>
        {imageUrls.length || files.length ? (
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-white"
                  onClick={() => setImageUrls((current) => current.filter((item) => item !== url))}
                >
                  ×
                </button>
              </div>
            ))}
            {files.map((file) => (
              <div key={file.name} className="h-16 w-16 overflow-hidden rounded-lg bg-paper text-[10px]">{file.name}</div>
            ))}
          </div>
        ) : null}
        <Field label={t("offers.field_external_url")} error={errors.external_url}>
          <input className={inputClass} value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
        </Field>
        <Field label={t("offers.field_external_url_label")} hint={t("offers.field_external_url_label_hint")}>
          <input className={inputClass} value={form.external_url_label} onChange={(e) => setForm({ ...form, external_url_label: e.target.value })} placeholder={defaultLabel} />
        </Field>
      </div>

      <div className="card space-y-4 p-5">
        <Toggle checked={form.is_online} onChange={(value) => setForm({ ...form, is_online: value, redemption_mode: value ? "view_only" : "scannable" })} label={t("offers.field_online")} />
        <p className="text-xs text-muted">{t("offers.field_online_hint")}</p>
        <Toggle checked={form.is_enabled} onChange={(value) => setForm({ ...form, is_enabled: value })} label={t("offers.field_enabled")} />
        {!form.is_online ? (
          <Field label={t("offers.redemption_mode")}>
            <select className={inputClass} value={form.redemption_mode} onChange={(e) => setForm({ ...form, redemption_mode: e.target.value })}>
              <option value="scannable">{t("offers.mode_scannable")}</option>
              <option value="view_only">{t("offers.mode_view_only")}</option>
            </select>
          </Field>
        ) : null}
        <Field label={t("offers.field_visible_branches")} hint={form.is_online ? t("offers.field_visible_branches_online_hint") : t("offers.field_visible_branches_hint")}>
          {!form.business_id ? (
            <p className="text-sm text-muted">{t("offers.select_business_first")}</p>
          ) : visibleBranches.length === 0 ? (
            <p className="text-sm text-muted">{t("offers.no_branches")}</p>
          ) : (
            <div className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex gap-2">
                <button type="button" className="text-xs font-semibold text-deal" onClick={() => setForm({ ...form, branch_ids: visibleBranches.map((b) => b.id) })}>
                  {t("offers.select_all_branches")}
                </button>
                <button type="button" className="text-xs font-semibold text-muted" onClick={() => setForm({ ...form, branch_ids: [] })}>
                  {t("offers.deselect_all_branches")}
                </button>
              </div>
              {visibleBranches.map((branch) => (
                <label key={branch.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.branch_ids.includes(branch.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        branch_ids: e.target.checked
                          ? [...form.branch_ids, branch.id]
                          : form.branch_ids.filter((id) => id !== branch.id),
                      })
                    }
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          )}
        </Field>
        <Field label={t("offers.field_usage_limit")}>
          <select className={inputClass} value={form.usage_limit_type} onChange={(e) => setForm({ ...form, usage_limit_type: e.target.value as UsageLimitType })}>
            {LIMITS.map((limit) => (
              <option key={limit} value={limit}>
                {limitLabel(limit)}
              </option>
            ))}
          </select>
        </Field>
        {needsCount ? (
          <Field label={t("offers.field_usage_count")} error={errors.usage_limit_count}>
            <input className={inputClass} value={form.usage_limit_count} onChange={(e) => setForm({ ...form, usage_limit_count: e.target.value })} />
          </Field>
        ) : null}
        <Toggle checked={form.is_time_limited} onChange={(value) => setForm({ ...form, is_time_limited: value })} label={t("offers.schedule_limited")} />
        <p className="text-xs text-muted">{t("offers.schedule_hint")}</p>
        {form.is_time_limited ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("offers.starts_at")}>
              <input type="datetime-local" className={inputClass} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </Field>
            <Field label={t("offers.ends_at")}>
              <input type="datetime-local" className={inputClass} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </Field>
          </div>
        ) : null}
        {!editing ? <p className="text-sm text-muted">{t("offers.qr_info")}</p> : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("common.saving") : editing ? t("common.save") : t("offers.create")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
