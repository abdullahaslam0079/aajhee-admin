import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-deal focus:ring-4 focus:ring-deal/15";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink/85">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
}) {
  const styles = {
    primary: "bg-deal-deep text-white shadow-sm hover:bg-deal",
    ghost: "bg-surface text-ink ring-1 ring-line hover:bg-paper",
    danger: "bg-red-600 text-white hover:bg-red-700",
    soft: "bg-deal-soft text-deal-ink hover:bg-deal-soft/80",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-deal-soft text-lg font-bold text-deal">
        ·
      </div>
      <p className="font-semibold">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "deal";
}) {
  const styles = {
    neutral: "bg-paper text-muted ring-line",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-200",
    deal: "bg-deal-soft text-deal-ink ring-deal/10",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  sparkline,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  sparkline?: number[];
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {sparkline?.length ? <Sparkline values={sparkline} className="text-deal" /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card block p-4 transition hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }
  return <div className="card p-4">{inner}</div>;
}

export function Pagination({
  page,
  pageSize,
  count,
  onPage,
  showingLabel,
  previousLabel,
  nextLabel,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (page: number) => void;
  showingLabel: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">{showingLabel}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {previousLabel}
        </Button>
        <span className="min-w-16 text-center text-xs font-semibold text-muted">
          {page} / {pages}
        </span>
        <Button type="button" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-muted hover:text-ink" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm font-semibold"
    >
      <span
        className={`relative h-6 w-10 rounded-full transition ${checked ? "bg-deal-deep" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-4.5" : "left-0.5"
          }`}
          style={{ left: checked ? "1.15rem" : "0.15rem" }}
        />
      </span>
      {label}
    </button>
  );
}

export function Cover({ src, label, className = "h-12 w-12" }: { src?: string | null; label: string; className?: string }) {
  if (src) {
    return <img src={src} alt="" className={`${className} rounded-xl object-cover`} />;
  }
  return (
    <div className={`${className} grid place-items-center rounded-xl bg-deal-soft font-bold text-deal`}>
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex text-sm font-semibold text-muted hover:text-ink">
      ← {label}
    </Link>
  );
}
