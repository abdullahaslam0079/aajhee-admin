import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
} from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://api.aajhee.com";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function toQuery(params?: Query) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/token/refresh`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        const text = await res.text();
        let data: unknown = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        if (!res.ok) {
          clearSession();
          return null;
        }
        const access =
          typeof data === "object" && data && "access" in data
            ? String((data as { access: string }).access)
            : null;
        const nextRefresh =
          typeof data === "object" && data && "refresh" in data
            ? String((data as { refresh: string }).refresh)
            : refresh;
        if (!access) {
          clearSession();
          return null;
        }
        updateAccessToken(access, nextRefresh);
        return access;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Proactively renew access when close to expiry. Safe to call often. */
export async function ensureFreshAccess(withinMs = 5 * 60 * 1000) {
  const token = getAccessToken();
  if (!token || !getRefreshToken()) return token;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as { exp?: number };
    if (!payload.exp) return token;
    if (payload.exp * 1000 - Date.now() > withinMs) return token;
  } catch {
    return token;
  }
  return (await refreshAccessToken()) || token;
}

export async function api<T>(
  path: string,
  options: RequestInit & { query?: Query; auth?: boolean; skipRefresh?: boolean } = {},
): Promise<T> {
  const { query, auth = false, skipRefresh = false, headers, ...rest } = options;
  let token = getAccessToken();
  if (auth && token && !skipRefresh) {
    token = (await ensureFreshAccess()) || token;
  }

  const res = await fetch(`${API_BASE}${path}${toQuery(query)}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (res.status === 401 && (auth || token) && !skipRefresh && getRefreshToken()) {
    const next = await refreshAccessToken();
    if (next) {
      return api<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (res.status === 401 && (auth || token)) {
    clearSession();
  }

  if (!res.ok) {
    const message =
      (typeof data === "object" &&
        data &&
        "message" in data &&
        String((data as { message: string }).message)) ||
      res.statusText;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export function pageResults<T>(payload: { results?: T[] } | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.results ?? [];
}
