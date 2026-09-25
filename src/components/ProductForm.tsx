"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, pageResults } from "@/lib/api";
import { compressImageFiles } from "@/lib/compressImage";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useToast } from "@/lib/toast";
import type { AdminBranch, AdminBusiness, Category } from "@/lib/types";
import { Button, Cover, ErrorBox, Field, inputClass } from "./ui";

export type AdminProduct = {
  id: number;
  business_id: number;
  business_name?: string;
  category_id: number;
  category_name?: string;
  branch_ids?: number[];
  name: string;
  description?: string;
  detailed_description?: string;
  image_url?: string | null;
  gallery?: Array<{ id: number; image_url?: string | null }>;
  base_price: string;
  sale_price?: string | null;
  discount_percent?: string | null;
  is_enabled?: boolean;
  is_available?: boolean;
};

export function ProductForm({
  product,
  initialBusinessId,
}: {
  product?: AdminProduct;
  initialBusinessId?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const editing = Boolean(product);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(
    [
      product?.image_url,
      ...(product?.gallery?.map((g) => g.image_url) || []),
    ].filter(Boolean) as string[],
  );
  const [form, setForm] = useState({
    business_id: String(product?.business_id || initialBusinessId || ""),
    category_id: String(product?.category_id || ""),
    name: product?.name || "",
    description: product?.description || "",
    detailed_description: product?.detailed_description || "",
    base_price: product?.base_price || "",
    sale_price: product?.sale_price || "",
    discount_percent: product?.discount_percent || "",
    branch_ids: (product?.branch_ids || []).map(String),
    is_enabled: product?.is_enabled !== false,
    is_available: product?.is_available !== false,
  });

  useEffect(() => {
    api<{ results?: AdminBusiness[] } | AdminBusiness[]>("/api/admin/businesses", {
      auth: true,
      query: { page_size: 200 },
    })
      .then((data) => setBusinesses(pageResults(data)))
      .catch(() => undefined);
    api<{ results?: Category[] } | Category[]>("/api/admin/categories", {
      auth: true,
      query: { page_size: 200 },
    })
      .then((data) => setCategories(pageResults(data)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.business_id) {
      setBranches([]);
      return;
    }
    api<{ results?: AdminBranch[] } | AdminBranch[]>(
      `/api/admin/businesses/${form.business_id}/branches`,
      { auth: true, query: { page_size: 100 } },
    )
      .then((data) => setBranches(pageResults(data)))
      .catch(() => setBranches([]));
  }, [form.business_id]);

  async function onFilesSelected(list: FileList | null) {
    if (!list?.length) return;
    const compressed = await compressImageFiles(Array.from(list));
    setFiles((current) => [...current, ...compressed]);
    setPreviews((current) => [
      ...current,
      ...compressed.map((file) => URL.createObjectURL(file)),
    ]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const data = new FormData();
      data.set("business_id", form.business_id);
      data.set("category_id", form.category_id);
      data.set("name", form.name);
      data.set("description", form.description);
      data.set("detailed_description", form.detailed_description);
      data.set("base_price", form.base_price);
      data.set("is_enabled", String(form.is_enabled));
      data.set("is_available", String(form.is_available));
      if (form.sale_price) data.set("sale_price", form.sale_price);
      if (form.discount_percent) data.set("discount_percent", form.discount_percent);
      form.branch_ids.forEach((id) => data.append("branch_ids", id));
      if (files[0]) data.set("image", files[0]);
      files.slice(1).forEach((file) => data.append("images", file));

      if (editing && product) {
        await api(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          auth: true,
          body: data,
        });
        toast.push("Listing saved");
        router.push("/products");
      } else {
        await api("/api/admin/products", { method: "POST", auth: true, body: data });
        toast.push("Listing created");
        router.push(form.business_id ? `/businesses/${form.business_id}` : "/products");
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err, "Could not save listing"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-2xl space-y-4 p-6">
      {error ? <ErrorBox message={error} /> : null}
      <Field label="Business" error={errors.business_id}>
        <select
          className={inputClass}
          value={form.business_id}
          onChange={(e) => setForm({ ...form, business_id: e.target.value, branch_ids: [] })}
          required
          disabled={editing}
        >
          <option value="">Select business</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Listing name" error={errors.name}>
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="e.g. Gold ring set"
        />
      </Field>
      <Field label="Category" error={errors.category_id}>
        <select
          className={inputClass}
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          required
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Short description" error={errors.description}>
        <textarea
          className={inputClass}
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field label="Detailed description" error={errors.detailed_description}>
        <textarea
          className={inputClass}
          rows={4}
          value={form.detailed_description}
          onChange={(e) => setForm({ ...form, detailed_description: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Price" error={errors.base_price}>
          <input
            className={inputClass}
            value={form.base_price}
            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            required
            inputMode="decimal"
          />
        </Field>
        <Field label="Sale price (optional)" error={errors.sale_price}>
          <input
            className={inputClass}
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            inputMode="decimal"
          />
        </Field>
        <Field label="Discount % (optional)" error={errors.discount_percent}>
          <input
            className={inputClass}
            value={form.discount_percent}
            onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
            inputMode="decimal"
          />
        </Field>
      </div>
      {branches.length ? (
        <Field label="Branches (optional)" hint="Leave empty to show for all business branches.">
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((branch) => {
              const checked = form.branch_ids.includes(String(branch.id));
              return (
                <label key={branch.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const id = String(branch.id);
                      setForm({
                        ...form,
                        branch_ids: e.target.checked
                          ? [...form.branch_ids, id]
                          : form.branch_ids.filter((x) => x !== id),
                      });
                    }}
                  />
                  {branch.name}
                </label>
              );
            })}
          </div>
        </Field>
      ) : null}
      <Field
        label="Photos"
        hint="Pick from gallery or camera. Images are compressed before upload (normal quality)."
        error={errors.image || errors.images}
      >
        <input
          className={inputClass}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => void onFilesSelected(e.target.files)}
        />
        {previews.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src) => (
              <Cover key={src} src={src} label={form.name || "P"} className="h-20 w-20" />
            ))}
          </div>
        ) : null}
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
          />
          Listing enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_available}
            onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
          />
          In stock / available
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save listing" : "Create listing"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
