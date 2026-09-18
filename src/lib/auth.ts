import type { AdminProfile } from "./types";

const ACCESS_KEY = "aajhee.admin.access";
const ADMIN_KEY = "aajhee.admin.profile";
const AUTH_EVENT = "aajhee-admin-auth";

let adminCache: AdminProfile | null = null;
let adminRaw: string | null = null;

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY);
}

export function getAdmin(): AdminProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_KEY) || sessionStorage.getItem(ADMIN_KEY);
  if (raw === adminRaw) return adminCache;
  adminRaw = raw;
  if (!raw) {
    adminCache = null;
    return null;
  }
  try {
    adminCache = JSON.parse(raw) as AdminProfile;
    return adminCache;
  } catch {
    adminCache = null;
    return null;
  }
}

export function setSession(payload: { access: string; admin: AdminProfile; remember: boolean }) {
  const target = payload.remember ? localStorage : sessionStorage;
  const other = payload.remember ? sessionStorage : localStorage;
  other.removeItem(ACCESS_KEY);
  other.removeItem(ADMIN_KEY);
  target.setItem(ACCESS_KEY, payload.access);
  target.setItem(ADMIN_KEY, JSON.stringify(payload.admin));
  adminRaw = target.getItem(ADMIN_KEY);
  adminCache = payload.admin;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
  adminRaw = null;
  adminCache = null;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function isLoggedIn() {
  return Boolean(getAccessToken());
}

export function subscribeAuth(cb: () => void) {
  window.addEventListener(AUTH_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(AUTH_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export { AUTH_EVENT };
