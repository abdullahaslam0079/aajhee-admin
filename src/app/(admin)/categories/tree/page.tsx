"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Empty, ErrorBox, Field, Modal, PageHeader, Skeleton, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
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
      .catch((err) => setError(errorMessage(err, "Failed to load category tree")))
      .finally(() => setLoading(false));
  }, []);

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
      toast.push("Category created");
      setOpen(false);
      setName("");
      setParentId("");
      load();
    } catch (err) {
      toast.push(errorMessage(err, "Could not create category"), "error");
    }
  }

  const flat = flatten(tree);

  return (
    <div>
      <PageHeader
        title="Category tree"
        subtitle="Hierarchical taxonomy (same names allowed under different parents)"
        actions={
          <Button onClick={() => setOpen(true)}>Add category</Button>
        }
      />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : flat.length === 0 ? (
        <Empty title="No categories" />
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
                {node.parent_id ? ` · parent ${node.parent_id}` : " · root"}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <div className="grid gap-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Parent (optional)">
            <select
              className={inputClass}
              value={parentId}
              onChange={(e) =>
                setParentId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Root</option>
              {flat.map((n) => (
                <option key={n.id} value={n.id}>
                  {"—".repeat(n.depth)} {n.name}
                </option>
              ))}
            </select>
          </Field>
          <Button onClick={create} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
