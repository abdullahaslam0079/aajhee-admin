import { ApiError } from "./api";

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.message === "string" && record.message) return record.message;
      const errors = record.errors;
      if (errors && typeof errors === "object") {
        const first = Object.values(errors as Record<string, unknown>)[0];
        if (Array.isArray(first) && first[0]) return String(first[0]);
        if (typeof first === "string") return first;
      }
      const detail = record.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail[0]) return String(detail[0]);
    }
    return error.message || fallback;
  }
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
    return "Could not reach the Aajhee API. Check your connection and CORS settings.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== "object") return {};
  const errors = (error.body as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") return {};
  const out: Record<string, string> = {};
  Object.entries(errors as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value) && value[0]) out[key] = String(value[0]);
    else if (typeof value === "string") out[key] = value;
  });
  return out;
}
