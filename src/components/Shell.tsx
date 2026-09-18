"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Store,
  Tag,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { api } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/auth";
import { displayName, tokenExpiryMs } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/useAuth";
import type { AdminOffer, Paginated } from "@/lib/types";
import { Button } from "./ui";

const NAV = [
  { href: "/dashboard", key: "admin.nav_dashboard", icon: LayoutDashboard },
  { href: "/businesses", key: "admin.nav_businesses", icon: Store },
  { href: "/offers", key: "admin.nav_offers", icon: TicketPercent },
  { href: "/users", key: "admin.nav_users", icon: Users },
  { href: "/categories", key: "admin.nav_categories", icon: Tag },
  { href: "/analytics", key: "admin.nav_analytics", icon: BarChart3 },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { admin } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const warned = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function tick() {
      const exp = tokenExpiryMs(getAccessToken());
      if (!exp) {
        setMinutesLeft(null);
        return;
      }
      const minutes = Math.max(0, Math.round((exp - Date.now()) / 60000));
      setMinutesLeft(minutes);
      if (minutes <= 5 && !warned.current) {
        warned.current = true;
        toast.push(t("admin.session_soon"), "info");
      }
    }
    const timeout = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(id);
    };
  }, [t, toast]);

  useEffect(() => {
    api<Paginated<AdminOffer>>("/api/admin/offers", {
      auth: true,
      query: { review_status: "pending", page_size: 1 },
    })
      .then((data) => setPendingCount(data.count ?? 0))
      .catch(() => undefined);
  }, [pathname]);

  async function logout() {
    try {
      await api("/api/admin/auth/logout", { method: "POST", auth: true });
    } catch {
      // still clear locally
    }
    clearSession();
    router.replace("/login");
  }

  const nav = (
    <nav className="grid gap-1 px-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_#c45f5f]"
                : "text-sidebar-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span className="flex-1">{t(item.key)}</span>
            {item.href === "/offers" && pendingCount > 0 ? (
              <span className="rounded-full bg-deal px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" />
          <div>
            <p className="text-sm font-semibold tracking-tight">{t("admin.app_name")}</p>
            <p className="text-[11px] text-sidebar-muted">aajhee.com</p>
          </div>
        </div>
        {nav}
        <div className="mt-auto border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{displayName(admin)}</p>
          <p className="truncate text-xs text-sidebar-muted">{admin?.email}</p>
          {minutesLeft != null ? (
            <p className={`mt-2 text-[11px] font-semibold ${minutesLeft <= 10 ? "text-amber-300" : "text-sidebar-muted"}`}>
              {t("admin.session_left", { minutes: minutesLeft })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex items-center gap-2 text-sm text-sidebar-muted hover:text-white"
          >
            <LogOut size={16} />
            {t("admin.logout")}
          </button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-semibold">{t("admin.app_name")}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur">
          <button type="button" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={22} />
          </button>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-left text-sm text-muted transition hover:border-ink/20"
          >
            <Search size={16} />
            <span className="truncate">{t("common.command_placeholder")}</span>
            <kbd className="ml-auto hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:inline">
              ⌘K
            </kbd>
          </button>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "de")}
              aria-label={t("common.language")}
            >
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>
            <select
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "system" | "light" | "dark")}
              aria-label={t("admin.theme")}
            >
              <option value="system">{t("admin.theme_system")}</option>
              <option value="light">{t("admin.theme_light")}</option>
              <option value="dark">{t("admin.theme_dark")}</option>
            </select>
            <Button type="button" variant="ghost" className="lg:hidden" onClick={logout}>
              {t("admin.logout")}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">{children}</main>
      </div>
      {commandOpen ? <CommandPalette open onClose={() => setCommandOpen(false)} /> : null}
    </div>
  );
}
