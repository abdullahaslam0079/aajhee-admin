"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { clearSession, getAccessToken, getAdmin, getRefreshToken, isLoggedIn, isRememberedSession, setSession, subscribeAuth } from "./auth";
import type { AdminProfile, AdminRole } from "./types";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export function resolveAdminRole(admin?: AdminProfile | null): AdminRole {
  if (!admin) return "support";
  if (admin.is_superuser) return "owner";
  if (admin.admin_role === "support") return "support";
  return "owner";
}

export function isOwner(admin?: AdminProfile | null) {
  return resolveAdminRole(admin) === "owner";
}

/** Support can write orders + reports; Owner can write everything. */
export function canWrite(
  admin: AdminProfile | null | undefined,
  area: "orders" | "reports" | "businesses" | "users" | "products" | "categories" | "offers" | "audit",
) {
  if (!admin) return false;
  if (isOwner(admin)) return true;
  return area === "orders" || area === "reports";
}

export { canWriteAdmin, isAdminOwner } from "./roles";

export function useAuth() {
  const loggedIn = useSyncExternalStore(subscribeAuth, isLoggedIn, () => false);
  const cached = useSyncExternalStore(subscribeAuth, getAdmin, () => null);

  useEffect(() => {
    if (!loggedIn) return;
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    api<AdminProfile>("/api/admin/me", { auth: true })
      .then((data) => {
        if (cancelled) return;
        const current = getAdmin();
        if (
          current &&
          current.id === data.id &&
          current.email === data.email &&
          current.first_name === data.first_name &&
          current.last_name === data.last_name &&
          current.admin_role === data.admin_role
        ) {
          return;
        }
        setSession({
          access: token,
          refresh: getRefreshToken(),
          admin: data,
          remember: isRememberedSession(),
        });
      })
      .catch(() => {
        if (cancelled) return;
        if (!getAdmin()) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const admin = loggedIn ? cached : null;
  const status: AuthStatus = !loggedIn ? "unauthenticated" : admin ? "authenticated" : "unknown";
  return { status, loggedIn: status === "authenticated", admin };
}
