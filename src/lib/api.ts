import { clearSession, getAccessToken } from "./auth";

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

export async function api<T>(
  path: string,
  options: RequestInit & { query?: Query; auth?: boolean } = {},
): Promise<T> {
  const { query, auth = false, headers, ...rest } = options;
  const token = getAccessToken();
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
