"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Badge, Button, Empty, ErrorBox, Field, PageHeader, Skeleton, inputClass } from "@/components/ui";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { api } from "@/lib/api";
import { whatsappHref, formatDateTime } from "@/lib/commerce";
import { errorMessage } from "@/lib/errors";
import { dateLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { formatOrderNumber } from "@/lib/orderNumber";
import { useToast } from "@/lib/toast";
import { canWrite, useAuth } from "@/lib/useAuth";
import type { AdminOrderProblemReport, ReportStatus } from "@/lib/types";

function statusTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "resolved") return "success";
  if (status === "in_progress") return "warning";
  if (status === "open") return "danger";
  return "neutral";
}

export default function ReportDetailPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const toast = useToast();
  const { admin } = useAuth();
  const writable = canWrite(admin, "reports");
  const [report, setReport] = useState<AdminOrderProblemReport | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<AdminOrderProblemReport>(`/api/admin/reports/${id}`, { auth: true })
      .then(setReport)
      .catch((err) => setError(errorMessage(err, t("reports.load_error"))));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: ReportStatus) {
    setBusy(true);
    try {
      const updated = await api<AdminOrderProblemReport>(`/api/admin/reports/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status }),
      });
      setReport(updated);
      toast.push(t("reports.status_updated"));
    } catch (err) {
      toast.push(errorMessage(err, t("reports.load_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const updated = await api<AdminOrderProblemReport>(`/api/admin/reports/${id}/notes`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ body: note.trim() }),
      });
      setReport(updated);
      setNote("");
      toast.push(t("reports.note_added"));
    } catch (err) {
      toast.push(errorMessage(err, t("reports.load_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    if (!resolution.trim()) {
      toast.push(t("reports.resolution_required"), "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await api<AdminOrderProblemReport>(`/api/admin/reports/${id}/resolve`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ resolution_note: resolution.trim() }),
      });
      setReport(updated);
      setResolution("");
      toast.push(t("reports.resolved_ok"));
    } catch (err) {
      toast.push(errorMessage(err, t("reports.load_error")), "error");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!report) return <Skeleton className="h-40" />;

  const customerPhone = report.customer_phone || report.order?.customer_phone;
  const merchantPhone = report.business_phone;

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: "/reports", label: t("reports.title") },
          { label: `#${report.id}` },
        ]}
      />
      <PageHeader
        title={t("reports.detail_title", { id: report.id })}
        subtitle={formatOrderNumber(report.order_public_id)}
        actions={
          <Badge tone={statusTone(report.status)}>
            {report.status === "open"
              ? t("reports.open")
              : report.status === "in_progress"
                ? t("reports.in_progress")
                : t("reports.resolved")}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">{t("reports.order_detail")}</h2>
          <p className="text-sm">
            <Link href={`/orders/${report.order_public_id}`} className="font-semibold text-deal">
              {formatOrderNumber(report.order_public_id)}
            </Link>
          </p>
          <p className="text-sm text-muted">{report.business_name}</p>
          <p className="text-sm">{report.reason || report.message}</p>
          <p className="text-xs text-muted">{dateLabel(report.created_at, locale)}</p>
          {report.order ? (
            <div className="mt-3 space-y-1 text-sm">
              <p>Total: Rs {report.order.total}</p>
              <p>Status: {report.order.status}</p>
              <p>{report.order.delivery_address_text}</p>
            </div>
          ) : null}
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Contacts</h2>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("reports.customer_phone")}</p>
            <p className="mt-1 text-sm">{customerPhone || "—"}</p>
            {customerPhone ? (
              <a href={whatsappHref(customerPhone)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-deal">
                {t("reports.whatsapp")}
              </a>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("reports.merchant_phone")}</p>
            <p className="mt-1 text-sm">{merchantPhone || "—"}</p>
            {merchantPhone ? (
              <a href={whatsappHref(merchantPhone)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-deal">
                {t("reports.whatsapp")}
              </a>
            ) : null}
          </div>

          {writable && report.status !== "resolved" ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {report.status === "open" ? (
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void setStatus("in_progress")}>
                  {t("reports.in_progress")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="card mt-6 space-y-4 p-5">
        <h2 className="font-semibold">{t("reports.internal_notes")}</h2>
        {(report.notes ?? []).length === 0 ? (
          <Empty title="No notes yet" />
        ) : (
          <ul className="space-y-3">
            {(report.notes ?? []).map((n) => (
              <li key={n.id} className="rounded-xl border border-line px-3 py-2">
                <p className="text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {n.author_name || n.author_email || "Admin"} · {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
        {writable ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("reports.note_placeholder")}
            />
            <Button type="button" disabled={busy || !note.trim()} onClick={() => void addNote()}>
              {t("reports.add_note")}
            </Button>
          </div>
        ) : null}
      </section>

      {writable && report.status !== "resolved" ? (
        <section className="card mt-6 space-y-3 p-5">
          <h2 className="font-semibold">{t("reports.resolve")}</h2>
          <Field label={t("reports.resolution_note")}>
            <textarea
              className={`${inputClass} min-h-24`}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
          </Field>
          <Button type="button" disabled={busy} onClick={() => void resolve()}>
            {t("reports.resolve")}
          </Button>
        </section>
      ) : report.resolution_note ? (
        <section className="card mt-6 space-y-2 p-5">
          <h2 className="font-semibold">{t("reports.resolution_note")}</h2>
          <p className="text-sm">{report.resolution_note}</p>
        </section>
      ) : null}
    </div>
  );
}
