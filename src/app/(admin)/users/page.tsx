"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Empty, ErrorBox, Field, Modal, PageHeader, Pagination, Skeleton, Toggle, inputClass } from "@/components/ui";
import { api, pageResults } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateLabel, userLabel } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminUser, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("");
  const [active, setActive] = useState("");
  const [includeStaff, setIncludeStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const q = useDebounced(search);

  const load = useCallback(() => {
    api<Paginated<AdminUser>>("/api/admin/users", {
      auth: true,
      query: {
        search: q,
        page,
        page_size: PAGE_SIZE,
        account_type: accountType || undefined,
        is_active: active || undefined,
        include_staff: includeStaff ? true : undefined,
      },
    })
      .then(setData)
      .catch((err) => setError(errorMessage(err, t("users.load_error"))))
      .finally(() => setLoading(false));
  }, [q, page, accountType, active, includeStaff, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(user: AdminUser, is_active: boolean) {
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ is_active }),
      });
      toast.push(t("users.updated"));
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("users.update_error")), "error");
    }
  }

  async function saveName() {
    if (!editing) return;
    try {
      await api(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      toast.push(t("users.updated"));
      setEditing(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("users.update_error")), "error");
    }
  }

  const items = pageResults(data);
  const count = data?.count ?? items.length;
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  return (
    <div>
      <PageHeader title={t("users.title")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} max-w-sm`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("users.search_hint")}
        />
        {[
          ["", t("users.filter_all")],
          ["consumer", t("users.filter_consumers")],
          ["business", t("users.filter_businesses")],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setAccountType(value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
              accountType === value ? "bg-deal-deep text-white ring-deal-deep" : "bg-surface ring-line"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          className={`${inputClass} max-w-40`}
          value={active}
          onChange={(e) => {
            setActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("common.all")}</option>
          <option value="true">{t("users.filter_active")}</option>
          <option value="false">{t("users.filter_inactive")}</option>
        </select>
        <Toggle
          checked={includeStaff}
          onChange={(value) => {
            setIncludeStaff(value);
            setPage(1);
          }}
          label={t("users.include_staff")}
        />
      </div>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Empty title={t("users.empty_title")} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("users.first_name")}</th>
                <th className="px-4 py-3 font-semibold">{t("auth.email")}</th>
                <th className="px-4 py-3 font-semibold">{t("users.account_type")}</th>
                <th className="px-4 py-3 font-semibold">{t("users.joined")}</th>
                <th className="px-4 py-3 font-semibold">{t("users.active")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium hover:text-deal"
                      onClick={() => {
                        setEditing(user);
                        setFirstName(user.first_name || "");
                        setLastName(user.last_name || "");
                      }}
                    >
                      {userLabel(user)}
                    </button>
                    {user.business_name ? <p className="text-xs text-muted">{user.business_name}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge>{user.account_type === "business" ? t("users.business") : t("users.consumer")}</Badge>
                      {user.is_staff ? <Badge tone="deal">{t("users.staff")}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{dateLabel(user.date_joined, locale)}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={user.is_active !== false} onChange={(value) => toggleActive(user, value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <Modal title={t("users.edit_name")} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label={t("users.first_name")}>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label={t("users.last_name")}>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={saveName}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
