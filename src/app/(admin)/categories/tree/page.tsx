"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Empty, ErrorBox, Field, Modal, PageHeader, Skeleton, inputClass } from "@/components/ui";
import { flattenCategoryTree } from "@/components/CategoryTreeSelect";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { CategoryTreeNode } from "@/lib/types";

type EditState = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | "";
  sort_order: string;
  is_active: boolean;
};

export default function CategoryTreePage() {
  const { t } = useI18n();
  const toast = useToast();
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | "">("");
  const [sortOrder, setSortOrder] = useState("0");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<CategoryTreeNode[]>("/api/admin/categories/tree", { auth: true })
      .then(setTree)
      .catch((err) => setError(errorMessage(err, t("category_tree.load_error"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const flat = flattenCategoryTree(tree);

  async function create() {
    setBusy(true);
    try {
      await api("/api/admin/categories/tree", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          name,
          parent_id: parentId === "" ? null : parentId,
          sort_order: Number(sortOrder) || 0,
          is_active: true,
        }),
      });
      toast.push(t("category_tree.created"));
      setCreateOpen(false);
      setName("");
      setParentId("");
      setSortOrder("0");
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("category_tree.create_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    try {
      await api(`/api/admin/categories/tree/${edit.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          name: edit.name,
          slug: edit.slug || undefined,
          parent_id: edit.parent_id === "" ? null : edit.parent_id,
          sort_order: Number(edit.sort_order) || 0,
          is_active: edit.is_active,
        }),
      });
      toast.push(t("category_tree.updated"));
      setEdit(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("category_tree.update_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(node: CategoryTreeNode) {
    const linked =
      (node.business_count || 0) + (node.product_count || 0) + (node.children?.length || 0);
    if (linked > 0) {
      toast.push(t("category_tree.delete_blocked"), "error");
      return;
    }
    if (!window.confirm(t("category_tree.delete_confirm", { name: node.name }))) return;
    setBusy(true);
    try {
      await api(`/api/admin/categories/tree/${node.id}`, {
        method: "DELETE",
        auth: true,
      });
      toast.push(t("category_tree.deleted"));
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("category_tree.delete_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("category_tree.title")}
        subtitle={t("category_tree.subtitle")}
        actions={
          <div className="flex gap-2">
            <Link href="/categories">
              <Button type="button" variant="ghost">
                {t("admin.nav_categories")}
              </Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)}>{t("category_tree.add")}</Button>
          </div>
        }
      />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : flat.length === 0 ? (
        <Empty title={t("category_tree.empty")} />
      ) : (
        <ul className="space-y-2">
          {flat.map((node) => (
            <li
              key={node.id}
              className="rounded-lg border border-[var(--border)] px-4 py-3"
              style={{ marginLeft: node.depth * 20 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {node.name}
                    {node.is_active === false ? (
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                        ({t("category_tree.inactive")})
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    id {node.id}
                    {node.slug ? ` · ${node.slug}` : ""}
                    {node.parent_id
                      ? ` · ${t("category_tree.parent_label", { id: node.parent_id })}`
                      : ` · ${t("category_tree.root_label")}`}
                    {` · sort ${node.sort_order ?? 0}`}
                    {` · ${t("category_tree.counts", {
                      businesses: node.business_count ?? 0,
                      products: node.product_count ?? 0,
                    })}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setEdit({
                        id: node.id,
                        name: node.name,
                        slug: node.slug || "",
                        parent_id: node.parent_id ?? "",
                        sort_order: String(node.sort_order ?? 0),
                        is_active: node.is_active !== false,
                      })
                    }
                  >
                    {t("common.edit")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => remove(node)} disabled={busy}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <Modal onClose={() => setCreateOpen(false)} title={t("category_tree.new_title")}>
          <div className="grid gap-3">
            <Field label={t("category_tree.field_name")}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t("category_tree.field_parent")}>
              <select
                className={inputClass}
                value={parentId}
                onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{t("category_tree.root")}</option>
                {flat.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.pathLabel}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("category_tree.field_sort")}>
              <input
                className={inputClass}
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </Field>
            <Button onClick={create} disabled={!name.trim() || busy}>
              {t("common.create")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {edit ? (
        <Modal onClose={() => setEdit(null)} title={t("category_tree.edit_title")}>
          <div className="grid gap-3">
            <Field label={t("category_tree.field_name")}>
              <input
                className={inputClass}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label={t("category_tree.field_slug")}>
              <input
                className={inputClass}
                value={edit.slug}
                onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
              />
            </Field>
            <Field label={t("category_tree.field_parent")}>
              <select
                className={inputClass}
                value={edit.parent_id}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    parent_id: e.target.value ? Number(e.target.value) : "",
                  })
                }
              >
                <option value="">{t("category_tree.root")}</option>
                {flat
                  .filter((n) => n.id !== edit.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.pathLabel}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={t("category_tree.field_sort")}>
              <input
                className={inputClass}
                type="number"
                value={edit.sort_order}
                onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.is_active}
                onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
              />
              {t("category_tree.field_active")}
            </label>
            <Button onClick={saveEdit} disabled={!edit.name.trim() || busy}>
              {t("common.save")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
