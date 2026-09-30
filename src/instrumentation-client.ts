import * as Sentry from "@sentry/nextjs";

const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || "").trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  });
}
