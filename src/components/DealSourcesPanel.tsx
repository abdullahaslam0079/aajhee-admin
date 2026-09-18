"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Empty, ErrorBox, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateTimeLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminDealSource, DealSourceKind, DealSourceSyncPayload } from "@/lib/types";

export function DealSourcesPanel({ businessId }: { businessId: string }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [sources, setSources] = useState<AdminDealSource[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [kind, setKind] = useState<DealSourceKind>("brand_listing");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [maxItems, setMaxItems] = useState("80");
  const [isOnline, setIsOnline] = useState(true);

  const load = useCallback(() => {
    api<AdminDealSource[]>(`/api/admin/businesses/${businessId}/deal-sources`, { auth: true })
      .then(setSources)
      .catch((err) => setError(errorMessage(err, t("sources.load_error"))));
  }, [businessId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        kind,
        name: name.trim(),
        is_online: isOnline,
        max_items: Number(maxItems) || 80,
      };
      if (kind === "affiliate_feed") payload.feed_url = trimmed;
      else payload.listing_url = trimmed;
      await api(`/api/admin/businesses/${businessId}/deal-sources`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });
      setName("");
      setUrl("");
      toast.push(t("sources.saved"));
      load();
    } catch (err) {
      setError(errorMessage(err, t("sources.save_error")));
    } finally {
      setSaving(false);
    }
  }

  async function syncNow(source: AdminDealSource) {
    setSyncingId(source.id);
    setError("");
    try {
      const data = await api<DealSourceSyncPayload>(`/api/admin/deal-sources/${source.id}/sync`, {
        method: "POST",
        auth: true,
      });
      const created = data.result?.created ?? 0;
      const updated = data.result?.updated ?? 0;
      const disabled =
        (data.result?.disabled_missing ?? 0) + (data.result?.disabled_unavailable ?? 0);
      const errText = data.source?.last_error || data.result?.error_samples?.[0];
      if (errText) {
        toast.push(errText, "error");
      } else {
        toast.push(t("sources.sync_done", { created, updated, disabled }));
      }
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("sources.sync_error")), "error");
    } finally {
      setSyncingId(null);
    }
  }

  async function remove(source: AdminDealSource) {
    try {
      await api(`/api/admin/deal-sources/${source.id}`, { method: "DELETE", auth: true });
      toast.push(t("sources.deleted"));
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("sources.delete_error")), "error");
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("sources.title")}</h2>
      </div>
      <p className="mb-4 text-sm text-muted">{t("sources.subtitle")}</p>
      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      <div className="card mb-4 space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("sources.field_kind")}>
            <select
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as DealSourceKind)}
            >
              <option value="brand_listing">{t("sources.kind_listing")}</option>
              <option value="affiliate_feed">{t("sources.kind_affiliate")}</option>
            </select>
          </Field>
          <Field label={t("sources.field_name")} hint={t("sources.field_name_hint")}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <Field
          label={kind === "affiliate_feed" ? t("sources.field_feed_url") : t("sources.field_listing_url")}
          hint={kind === "affiliate_feed" ? t("sources.field_feed_url_hint") : t("sources.field_listing_url_hint")}
        >
          <input
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("sources.field_max_items")}>
            <input
              className={`${inputClass} w-28`}
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
            {t("sources.field_online")}
          </label>
          <Button type="button" onClick={addSource} disabled={saving || !url.trim()}>
            {saving ? t("common.loading") : t("sources.add")}
          </Button>
        </div>
      </div>

      {sources.length === 0 ? (
        <Empty title={t("sources.empty_title")} body={t("sources.empty_subtitle")} />
      ) : (
        <div className="card divide-y divide-line">
          {sources.map((source) => (
            <div key={source.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{source.name || t("sources.untitled")}</p>
                  <Badge tone="deal">
                    {source.kind === "affiliate_feed" ? t("sources.kind_affiliate") : t("sources.kind_listing")}
                  </Badge>
                  {source.is_enabled === false ? <Badge tone="warning">{t("offers.status_paused")}</Badge> : null}
                  {source.last_error ? (
                    <Badge tone="danger">
                      {/blocked|HTTP 40[13]|HTTP 429/i.test(source.last_error)
                        ? t("sources.blocked")
                        : t("sources.sync_issue")}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted">
                  {source.kind === "affiliate_feed" ? source.feed_url : source.listing_url}
                </p>
                <p className="text-xs text-muted">
                  {t("sources.last_synced")}:{" "}
                  {source.last_synced_at ? dateTimeLabel(source.last_synced_at, locale) : t("sources.never")}
                  {source.last_error ? ` · ${source.last_error}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => syncNow(source)}
                  disabled={syncingId === source.id}
                >
                  {syncingId === source.id ? t("sources.syncing") : t("sources.sync_now")}
                </Button>
                <Button type="button" variant="danger" onClick={() => remove(source)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
