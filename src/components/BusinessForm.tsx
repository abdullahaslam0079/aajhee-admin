"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, pageResults } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBusiness, Category } from "@/lib/types";
import { Button, Cover, ErrorBox, Field, inputClass } from "./ui";

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

  return (
    <form onSubmit={submit} className="card mx-auto max-w-xl space-y-4 p-6">
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
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
      <Field label={t("businesses.email")} error={errors.email} hint={editing ? t("businesses.owner") : undefined}>
        <input className={inputClass} type="email" value={form.email} disabled={editing} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </Field>
      {editing ? null : (
        <>
          <Field label={t("businesses.password")} error={errors.password}>
            <input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </Field>
          <Field label={t("businesses.confirm_password")} error={errors.password_confirm}>
            <input className={inputClass} type="password" value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} required />
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
