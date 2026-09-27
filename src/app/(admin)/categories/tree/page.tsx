"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Empty, ErrorBox, Field, Modal, PageHeader, Skeleton, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";

type CategoryNode = {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
  children?: CategoryNode[];
};

function flatten(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const node of nodes) {
    out.push({ ...node, depth });
    if (node.children?.length) out.push(...flatten(node.children, depth + 1));
  }
  return out;
}

export default function CategoryTreePage() {
  const { t } = useI18n();
  const toast = useToast();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | "">("");

  const load = useCallback(() => {
    setLoading(true);
    api<CategoryNode[]>("/api/admin/categories/tree", { auth: true })
      .then(setTree)
      .catch((err) => setError(errorMessage(err, t("category_tree.load_error"))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    try {
      await api("/api/admin/categories/tree", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          name,
          parent_id: parentId === "" ? null : parentId,
        }),
      });
      toast.push(t("category_tree.created"));
      setOpen(false);
      setName("");
      setParentId("");
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("category_tree.create_error")), "error");
    }
  }

  const flat = flatten(tree);

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
            <Button onClick={() => setOpen(true)}>{t("category_tree.add")}</Button>
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
              <div className="font-medium">{node.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                id {node.id}
                {node.parent_id
                  ? ` · ${t("category_tree.parent_label", { id: node.parent_id })}`
                  : ` · ${t("category_tree.root_label")}`}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <Modal onClose={() => setOpen(false)} title={t("category_tree.new_title")}>
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
                    {"—".repeat(n.depth)} {n.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button onClick={create} disabled={!name.trim()}>
              {t("common.create")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
