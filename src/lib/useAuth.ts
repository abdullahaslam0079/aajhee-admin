"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { clearSession, getAccessToken, getAdmin, isLoggedIn, setSession, subscribeAuth } from "./auth";
import type { AdminProfile } from "./types";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

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
          current.last_name === data.last_name
        ) {
          return;
        }
        const remember = Boolean(localStorage.getItem("aajhee.admin.access"));
        setSession({ access: token, admin: data, remember });
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
