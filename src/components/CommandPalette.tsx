"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, pageResults } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { AdminBusiness, AdminOffer, AdminUser, Paginated } from "@/lib/types";

type Hit = { href: string; title: string; subtitle?: string; group: string };

const PAGES = [
  { href: "/dashboard", key: "admin.nav_dashboard" },
  { href: "/businesses", key: "admin.nav_businesses" },
  { href: "/offers", key: "admin.nav_offers" },
  { href: "/offers?review=pending", key: "offers.filter_review" },
  { href: "/users", key: "admin.nav_users" },
  { href: "/categories", key: "admin.nav_categories" },
  { href: "/analytics", key: "admin.nav_analytics" },
  { href: "/businesses/new", key: "admin.new_business" },
  { href: "/offers/new", key: "admin.new_offer" },
] as const;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Hit[]>([]);
  const q = useDebounced(query, 220);

  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const search = q.trim();
    let cancelled = false;
    Promise.all([
      api<Paginated<AdminBusiness>>("/api/admin/businesses", { auth: true, query: { search, page_size: 5 } }),
      api<Paginated<AdminOffer>>("/api/admin/offers", { auth: true, query: { search, page_size: 5 } }),
      api<Paginated<AdminUser>>("/api/admin/users", { auth: true, query: { search, page_size: 5 } }),
    ])
      .then(([biz, offers, users]) => {
        if (cancelled) return;
        const hits: Hit[] = [
          ...pageResults(biz).map((item) => ({
            href: `/businesses/${item.id}`,
            title: item.name,
            subtitle: item.category_name || item.email,
            group: t("admin.nav_businesses"),
          })),
          ...pageResults(offers).map((item) => ({
            href: `/offers/${item.id}`,
            title: item.title,
            subtitle: item.business_name,
            group: t("admin.nav_offers"),
          })),
          ...pageResults(users).map((item) => ({
            href: "/users",
            title: [item.first_name, item.last_name].filter(Boolean).join(" ") || item.email,
            subtitle: item.email,
            group: t("admin.nav_users"),
          })),
        ];
        setRemote(hits);
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, q, t]);

  const pages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PAGES.filter((page) => !needle || t(page.key).toLowerCase().includes(needle)).map((page) => ({
      href: page.href,
      title: t(page.key),
      group: t("common.command_pages"),
    }));
  }, [query, t]);

  const items = useMemo(() => {
    const remoteItems = q.trim().length < 2 ? [] : remote;
    return [...pages, ...remoteItems];
  }, [pages, remote, q]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/45 p-4 pt-[12vh]" onClick={onClose}>
      <div
        className="card w-full max-w-xl overflow-hidden shadow-lift"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(items.length - 1, i + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          }
          if (e.key === "Enter" && items[active]) go(items[active].href);
        }}
      >
        <input
          ref={inputRef}
          autoFocus
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-base outline-none"
          placeholder={t("common.command_placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
        />
        <div className="max-h-80 overflow-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">{t("common.command_empty")}</p>
          ) : (
            items.map((item, index) => (
              <button
                key={`${item.href}-${item.title}-${index}`}
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item.href)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                  index === active ? "bg-deal-soft text-deal-ink" : "hover:bg-paper"
                }`}
              >
                <span>
                  <span className="font-semibold">{item.title}</span>
                  {"subtitle" in item && item.subtitle ? (
                    <span className="ml-2 text-muted">{item.subtitle}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {item.group}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
