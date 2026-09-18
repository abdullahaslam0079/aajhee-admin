"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, ConfirmDialog, Empty, ErrorBox, Field, Modal, PageHeader, Pagination, Skeleton, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { Category, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

export default function CategoriesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Category> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);
  const q = useDebounced(search);

  const load = useCallback(() => {
    api<Paginated<Category>>("/api/admin/categories", {
      auth: true,
      query: { search: q, page, page_size: PAGE_SIZE },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("categories.load_error"))))
      .finally(() => setLoading(false));
  }, [q, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    try {
      if (editing === "new") {
        await api("/api/admin/categories", { method: "POST", auth: true, body: JSON.stringify({ name }) });
      } else if (editing) {
        await api(`/api/admin/categories/${editing.id}`, {
          method: "PATCH",
          auth: true,
          body: JSON.stringify({ name }),
        });
      }
      toast.push(t("categories.saved"));
      setEditing(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("categories.save_error")), "error");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/api/admin/categories/${deleting.id}`, { method: "DELETE", auth: true });
      toast.push(t("categories.deleted"));
      setDeleting(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("categories.delete_error")), "error");
    }
  }

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  return (
    <div>
      <PageHeader
        title={t("categories.title")}
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditing("new");
              setName("");
            }}
          >
            {t("categories.add")}
          </Button>
        }
      />
      <input
        className={`${inputClass} mb-4 max-w-md`}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={t("categories.search_hint")}
      />
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <Empty title={t("categories.empty_title")} />
      ) : (
        <div className="card divide-y divide-line">
          {items.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted">{t("categories.business_count", { count: cat.business_count ?? 0 })}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(cat);
                    setName(cat.name);
                  }}
                >
                  {t("common.edit")}
                </Button>
                <Button type="button" variant="danger" onClick={() => setDeleting(cat)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        count={count}
        onPage={setPage}
        showingLabel={t("common.showing", { from, to, count })}
        previousLabel={t("common.previous")}
        nextLabel={t("common.next")}
      />
      {editing ? (
        <Modal title={editing === "new" ? t("categories.add") : t("categories.edit")} onClose={() => setEditing(null)}>
          <Field label={t("categories.name")}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={save} disabled={!name.trim()}>
              {t("common.save")}
            </Button>
          </div>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={t("categories.delete_title")}
          message={t("categories.delete_message")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
