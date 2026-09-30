"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  ensureNotificationPermission,
  playAdminAlertSound,
  showBrowserNotification,
} from "@/lib/adminAlerts";
import type { AnalyticsOverview } from "@/lib/types";

export type AdminActionCounts = {
  pending: number;
  paymentSubmitted: number;
  pendingProofs: number;
  openReports: number;
  /** Badge on Orders nav: pending + payment submitted. */
  ordersBadge: number;
};

const EMPTY: AdminActionCounts = {
  pending: 0,
  paymentSubmitted: 0,
  pendingProofs: 0,
  openReports: 0,
  ordersBadge: 0,
};

function fromOverview(data: AnalyticsOverview): AdminActionCounts {
  const counts = data.counts || {};
  const pending = counts.orders_pending || 0;
  const paymentSubmitted = counts.orders_payment_submitted || 0;
  const pendingProofs = counts.pending_payment_proofs || 0;
  const openReports = counts.open_reports || 0;
  return {
    pending,
    paymentSubmitted,
    pendingProofs,
    openReports,
    ordersBadge: pending + paymentSubmitted,
  };
}

async function fetchActionCounts(): Promise<AdminActionCounts> {
  const data = await api<AnalyticsOverview>("/api/admin/analytics/overview", {
    auth: true,
  }).catch(() => null);
  if (!data) return EMPTY;
  return fromOverview(data);
}

export function useAdminActionCounts(enabled: boolean, intervalMs = 15000) {
  const [counts, setCounts] = useState<AdminActionCounts>(EMPTY);
  const mounted = useRef(true);
  const primed = useRef(false);
  const previous = useRef<AdminActionCounts>(EMPTY);

  const refresh = useCallback(() => {
    if (!enabled) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    fetchActionCounts()
      .then((next) => {
        if (!mounted.current) return;
        if (primed.current) {
          const grewPending = next.pending > previous.current.pending;
          const grewProofs =
            next.paymentSubmitted > previous.current.paymentSubmitted ||
            next.pendingProofs > previous.current.pendingProofs;
          if (grewPending || grewProofs) {
            playAdminAlertSound();
            const href = grewPending
              ? "/orders?status=pending"
              : "/orders?status=payment_submitted";
            showBrowserNotification(
              grewPending ? "New pending order" : "Payment proof needs review",
              grewPending
                ? `${next.pending} pending order(s) on Aajhee`
                : `${next.paymentSubmitted} payment submitted · ${next.pendingProofs} proof(s)`,
              href,
            );
          }
        } else {
          primed.current = true;
        }
        previous.current = next;
        setCounts(next);
      })
      .catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    if (enabled) void ensureNotificationPermission();
    refresh();
    if (!enabled) return;
    const id = window.setInterval(refresh, intervalMs);
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, refresh]);

  return { counts, refresh };
}
