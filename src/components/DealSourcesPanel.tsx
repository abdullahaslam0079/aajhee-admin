"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Field,
  Modal,
  Skeleton,
  Toggle,
  inputClass,
} from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { dateTimeLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type {
  AdminDealSource,
  DealSourceKind,
  DealSourceSyncPayload,
} from "@/lib/types";

export function DealSourcesPanel({ businessId }: { businessId: number }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [sources, setSources] = useState<AdminDealSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [kind, setKind] = useState<DealSourceKind>("brand_listing");
  const [name, setName] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [maxItems, setMaxItems] = useState("80");
  const [isOnline, setIsOnline] = useState(true);

  const load = useCallback(() => {
    return api<AdminDealSource[]>(`/api/admin/businesses/${businessId}/deal-sources`, { auth: true })
      .then((data) => {
        setSources(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, t("sources.load_error"))))
      .finally(() => setLoading(false));
  }, [businessId, t]);

  useEffect(() => {
    let cancelled = false;
    // Initial fetch for this business; loading flag is intentional sync with the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load pattern
    setLoading(true);
    api<AdminDealSource[]>(`/api/admin/businesses/${businessId}/deal-sources`, { auth: true })
      .then((data) => {
        if (cancelled) return;
        setSources(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err, t("sources.load_error")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, t]);

  function resetForm() {
    setKind("brand_listing");
    setName("");
    setListingUrl("");
    setFeedUrl("");
    setMaxItems("80");
    setIsOnline(true);
  }

  async function create() {
    setSaving(true);
    try {
      await api(`/api/admin/businesses/${businessId}/deal-sources`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          kind,
          name: name.trim() || undefined,
          listing_url: kind === "brand_listing" ? listingUrl.trim() : "",
          feed_url: kind === "affiliate_feed" ? feedUrl.trim() : "",
          max_items: Number(maxItems) || 80,
          is_online: isOnline,
          is_enabled: true,
        }),
      });
      toast.push(t("sources.saved"));
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("sources.save_error")), "error");
    } finally {
      setSaving(false);
    }
  }

  async function sync(sourceId: number) {
    setSyncingId(sourceId);
    try {
      const payload = await api<DealSourceSyncPayload>(`/api/admin/deal-sources/${sourceId}/sync`, {
        method: "POST",
        auth: true,
      });
      const result = payload.result;
      toast.push(
        t("sources.sync_done", {
          created: result?.created ?? 0,
          updated: result?.updated ?? 0,
          disabled: result?.disabled_missing ?? result?.disabled_unavailable ?? 0,
        }),
      );
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("sources.sync_error")), "error");
    } finally {
      setSyncingId(null);
    }
  }

  async function remove() {
    if (deletingId == null) return;
    try {
      await api(`/api/admin/deal-sources/${deletingId}`, { method: "DELETE", auth: true });
      toast.push(t("sources.deleted"));
      setDeletingId(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err, t("sources.delete_error")), "error");
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("sources.title")}</h2>
          <p className="text-sm text-muted">{t("sources.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/offers?review_status=pending">
            <Button type="button" variant="ghost">
              {t("offers.filter_review")}
            </Button>
          </Link>
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            {t("sources.add")}
          </Button>
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : null}

      {loading ? (
        <Skeleton className="mb-8 h-32" />
      ) : sources.length === 0 ? (
        <Empty
          title={t("sources.empty_title")}
          body={t("sources.empty_subtitle")}
          action={
            <Button type="button" onClick={() => setOpen(true)}>
              {t("sources.add")}
            </Button>
          }
        />
      ) : (
        <div className="card mb-8 divide-y divide-line">
          {sources.map((source) => (
            <div key={source.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{source.name || t("sources.untitled")}</p>
                  <Badge>
                    {source.kind === "affiliate_feed"
                      ? t("sources.kind_affiliate")
                      : t("sources.kind_listing")}
                  </Badge>
                  {source.is_enabled === false ? (
                    <Badge tone="warning">{t("common.disabled")}</Badge>
                  ) : (
                    <Badge tone="success">{t("common.enabled")}</Badge>
                  )}
                  {source.is_online ? <Badge tone="deal">{t("offers.online_badge")}</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {source.kind === "affiliate_feed" ? source.feed_url : source.listing_url}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t("sources.last_synced")}:{" "}
                  {source.last_synced_at
                    ? dateTimeLabel(source.last_synced_at, locale === "de" ? "de-DE" : "en-GB")
                    : t("sources.never")}
                </p>
                {source.last_error ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {t("sources.sync_issue")}: {source.last_error}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={syncingId === source.id}
                  onClick={() => void sync(source.id)}
                >
                  {syncingId === source.id ? t("sources.syncing") : t("sources.sync_now")}
                </Button>
                <Button type="button" variant="danger" onClick={() => setDeletingId(source.id)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <Modal title={t("sources.add")} onClose={() => setOpen(false)}>
          <div className="space-y-3">
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
            {kind === "brand_listing" ? (
              <Field label={t("sources.field_listing_url")} hint={t("sources.field_listing_url_hint")}>
                <input
                  className={inputClass}
                  type="url"
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  required
                />
              </Field>
            ) : (
              <Field label={t("sources.field_feed_url")} hint={t("sources.field_feed_url_hint")}>
                <input
                  className={inputClass}
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  required
                />
              </Field>
            )}
            <Field label={t("sources.field_max_items")}>
              <input
                className={inputClass}
                type="number"
                min={1}
                max={500}
                value={maxItems}
                onChange={(e) => setMaxItems(e.target.value)}
              />
            </Field>
            <Toggle checked={isOnline} onChange={setIsOnline} label={t("sources.field_online")} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void create()}>
                {saving ? t("common.saving") : t("common.create")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {deletingId != null ? (
        <ConfirmDialog
          title={t("common.delete")}
          message={t("sources.delete_confirm")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setDeletingId(null)}
          onConfirm={() => void remove()}
        />
      ) : null}
    </div>
  );
}
