"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, pageResults } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, Category, OnlineCoverage, PresenceMode } from "@/lib/types";
import { Button, Cover, ErrorBox, Field, inputClass } from "./ui";

const PRESENCE_OPTIONS: Array<{ value: PresenceMode; label: string; hint: string }> = [
  {
    value: "online_only",
    label: "Online only",
    hint: "Visible for online shopping; no in-store requirement.",
  },
  {
    value: "instore_only",
    label: "In-store only",
    hint: "Shown to nearby customers for physical visits.",
  },
  {
    value: "hybrid",
    label: "Online and in-store",
    hint: "Both online discovery and local store presence.",
  },
];

export function BusinessForm({ business }: { business?: AdminBusiness }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const editing = Boolean(business);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(business?.logo_url || "");
  const [form, setForm] = useState({
    name: business?.name || "",
    category_id: String(business?.category_id || ""),
    email: business?.email || "",
    password: "",
    password_confirm: "",
    phone: business?.phone || "",
    notification_whatsapp: business?.notification_whatsapp || "",
    instagram_url: business?.instagram_url || "",
    city: "",
    address: "",
    presence_mode: (business?.presence_mode || "hybrid") as PresenceMode,
    online_coverage: (business?.online_coverage || "city") as OnlineCoverage,
    verification_status: business?.verification_status || "under_review",
  });

  useEffect(() => {
    api<{ results?: Category[] } | Category[]>("/api/admin/categories", {
      auth: true,
      query: { page_size: 100 },
    })
      .then((data) => setCategories(pageResults(data)))
      .catch((err) => setError(errorMessage(err, t("businesses.category_load_error"))));
  }, [t]);

  function onLogo(file?: File) {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const data = new FormData();
      data.set("name", form.name);
      data.set("category_id", form.category_id);
      data.set("presence_mode", form.presence_mode);
      data.set("online_coverage", form.online_coverage);
      data.set("phone", form.phone);
      data.set("notification_whatsapp", form.notification_whatsapp);
      data.set("instagram_url", form.instagram_url);
      if (!editing) {
        if (form.city) data.set("primary_city", form.city);
        if (form.address) data.set("address_text", form.address);
      }
      if (editing) data.set("verification_status", form.verification_status);
      if (!editing) {
        data.set("email", form.email);
        data.set("password", form.password);
        data.set("password_confirm", form.password_confirm);
      }
      if (logoFile) data.set("logo", logoFile);

      if (editing && business) {
        await api(`/api/admin/businesses/${business.id}`, { method: "PATCH", auth: true, body: data });
        toast.push(t("businesses.saved"));
        router.push(`/businesses/${business.id}`);
      } else {
        const created = await api<AdminBusiness>("/api/admin/businesses", {
          method: "POST",
          auth: true,
          body: data,
        });
        toast.push(t("businesses.saved"));
        router.push(`/businesses/${created.id}`);
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, t("businesses.save_error")));
    } finally {
      setSaving(false);
    }
  }

  const showCoverage = form.presence_mode !== "instore_only";

  return (
    <form
      onSubmit={submit}
      className="card mx-auto max-w-xl space-y-4 p-6"
      autoComplete="off"
    >
      {error ? <ErrorBox message={error} /> : null}
      <div className="flex items-center gap-4">
        <Cover src={logoPreview} label={form.name || "B"} className="h-16 w-16" />
        <label className="cursor-pointer text-sm font-semibold text-deal">
          {t("businesses.logo_pick")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogo(e.target.files?.[0])}
          />
        </label>
      </div>
      <Field label={t("businesses.name")} error={errors.name}>
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="off" />
      </Field>
      <Field label={t("businesses.category")} error={errors.category_id}>
        <select className={inputClass} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
          <option value="">{t("auth.category_required")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Phone" error={errors.phone}>
        <input
          className={inputClass}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+92…"
          autoComplete="off"
        />
      </Field>
      <Field label="WhatsApp / alerts" error={errors.notification_whatsapp}>
        <input
          className={inputClass}
          value={form.notification_whatsapp}
          onChange={(e) => setForm({ ...form, notification_whatsapp: e.target.value })}
          placeholder="+92…"
          autoComplete="off"
        />
      </Field>
      <Field label="Instagram" error={errors.instagram_url}>
        <input
          className={inputClass}
          value={form.instagram_url}
          onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
          placeholder="https://instagram.com/…"
          autoComplete="off"
        />
      </Field>
      {!editing ? (
        <>
          <Field label="City" error={errors.city}>
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              autoComplete="off"
            />
          </Field>
          <Field label="Address" error={errors.address}>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              autoComplete="off"
            />
          </Field>
        </>
      ) : null}

      <Field label={t("businesses.presence_mode")} error={errors.presence_mode} hint={t("businesses.presence_hint")}>
        <div className="space-y-2">
          {PRESENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-2 hover:bg-paper"
            >
              <input
                type="radio"
                name="presence_mode"
                className="mt-1"
                checked={form.presence_mode === option.value}
                onChange={() => setForm({ ...form, presence_mode: option.value })}
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>

      {showCoverage ? (
        <Field label={t("businesses.online_coverage")} error={errors.online_coverage}>
          <select
            className={inputClass}
            value={form.online_coverage}
            onChange={(e) =>
              setForm({ ...form, online_coverage: e.target.value as OnlineCoverage })
            }
          >
            <option value="city">City</option>
            <option value="country">Whole country</option>
          </select>
        </Field>
      ) : null}

      {editing ? (
        <Field label="Verification status" error={errors.verification_status}>
          <select
            className={inputClass}
            value={form.verification_status}
            onChange={(e) => setForm({ ...form, verification_status: e.target.value })}
          >
            <option value="under_review">Under review</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
      ) : null}

      <Field label={t("businesses.email")} error={errors.email} hint={editing ? t("businesses.owner") : undefined}>
        <input
          className={inputClass}
          type="email"
          name="admin_business_email"
          value={form.email}
          disabled={editing}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="off"
        />
      </Field>
      {editing ? null : (
        <>
          <Field label={t("businesses.password")} error={errors.password}>
            <input
              className={inputClass}
              type="password"
              name="admin_business_password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <Field label={t("businesses.confirm_password")} error={errors.password_confirm}>
            <input
              className={inputClass}
              type="password"
              name="admin_business_password_confirm"
              value={form.password_confirm}
              onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
              required
              autoComplete="new-password"
            />
          </Field>
        </>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("common.saving") : editing ? t("common.save") : t("businesses.create")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
