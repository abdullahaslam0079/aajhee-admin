"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBranch } from "@/lib/types";
import { AddressSearch } from "./AddressSearch";
import { Button, ErrorBox, Field, inputClass } from "./ui";

export function BranchForm({
  businessId,
  branch,
}: {
  businessId: string;
  branch?: AdminBranch;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const editing = Boolean(branch);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: branch?.name || "",
    street: branch?.street || "",
    house_number: branch?.house_number || "",
    postal_code: branch?.postal_code || "",
    city: branch?.city || "Berlin",
    latitude: String(branch?.latitude ?? "52.520000"),
    longitude: String(branch?.longitude ?? "13.405000"),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    };
    try {
      if (editing && branch) {
        await api(`/api/admin/branches/${branch.id}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/api/admin/businesses/${businessId}/branches`, {
          method: "POST",
          auth: true,
          body: JSON.stringify(payload),
        });
      }
      toast.push(t("branches.saved"));
      router.push(`/businesses/${businessId}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, t("branches.save_error")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-xl space-y-4 p-6">
      {error ? <ErrorBox message={error} /> : null}
      <Field label={t("branches.address_search")}>
        <AddressSearch
          onPick={(hit) =>
            setForm((current) => ({
              ...current,
              street: hit.street || current.street,
              house_number: hit.houseNumber || current.house_number,
              postal_code: hit.postalCode || current.postal_code,
              city: hit.city || current.city,
              latitude: hit.latitude,
              longitude: hit.longitude,
            }))
          }
        />
      </Field>
      <Field label={t("branches.name")} error={errors.name}>
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder={t("branches.name_hint")} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("branches.street")} error={errors.street}>
          <input className={inputClass} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
        </Field>
        <Field label={t("branches.house_number")} error={errors.house_number}>
          <input className={inputClass} value={form.house_number} onChange={(e) => setForm({ ...form, house_number: e.target.value })} required />
        </Field>
        <Field label={t("branches.postal_code")} error={errors.postal_code}>
          <input className={inputClass} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} required />
        </Field>
      </div>
      <Field label={t("branches.city")} error={errors.city}>
        <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("branches.latitude")} error={errors.latitude}>
          <input className={inputClass} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required />
        </Field>
        <Field label={t("branches.longitude")} error={errors.longitude}>
          <input className={inputClass} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("common.saving") : editing ? t("common.save") : t("branches.create")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
