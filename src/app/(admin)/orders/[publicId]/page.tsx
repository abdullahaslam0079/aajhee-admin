"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  BackLink,
  Badge,
  Button,
  Empty,
  ErrorBox,
  Field,
  PageHeader,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  STATUS_ACTION_LABELS,
  formatDateTime,
  isDeliveryFulfillment,
  labelFulfillment,
  labelPayment,
  labelStatus,
  nextActions,
  statusTone,
  whatsappHref,
} from "@/lib/commerce";
import { errorMessage } from "@/lib/errors";
import { rs } from "@/lib/format";
import { formatOrderNumber } from "@/lib/orderNumber";
import { useToast } from "@/lib/toast";
import type { AdminOrder, OrderStatus, PaymentProofReviewStatus } from "@/lib/types";

export default function AdminOrderDetailPage({ params }: PageProps<"/orders/[publicId]">) {
  const { publicId } = use(params);
  const toast = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [escalated, setEscalated] = useState(false);

  const load = useCallback(() => {
    api<AdminOrder>(`/api/admin/orders/${publicId}`, { auth: true })
      .then((data) => {
        setOrder(data);
        setAdminNotes(data.admin_note || "");
        setEscalated(Boolean(data.is_escalated));
        setError("");
      })
      .catch((err) => setError(errorMessage(err, "Could not load order")));
  }, [publicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: OrderStatus) {
    setBusy(true);
    setError("");
    try {
      const updated = await api<AdminOrder>(`/api/admin/orders/${publicId}/status`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          status,
          reason: status === "cancelled" ? cancelReason.trim() || undefined : undefined,
        }),
      });
      setOrder(updated);
      setCancelReason("");
      toast.push(`Order → ${labelStatus(status)}`);
    } catch (err) {
      setError(errorMessage(err, "Could not update order status"));
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminMeta() {
    setBusy(true);
    try {
      const updated = await api<AdminOrder>(`/api/admin/orders/${publicId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ admin_note: adminNotes, is_escalated: escalated }),
      });
      setOrder(updated);
      setAdminNotes(updated.admin_note || "");
      toast.push("Order notes saved");
    } catch (err) {
      setError(errorMessage(err, "Could not save admin notes"));
    } finally {
      setBusy(false);
    }
  }

  async function reviewProof(proofId: number, review_status: Exclude<PaymentProofReviewStatus, "pending">) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/orders/${publicId}/payment-proofs/${proofId}/review`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ review_status, review_note: reviewNote.trim() }),
      });
      setReviewNote("");
      toast.push(review_status === "accepted" ? "Payment accepted" : "Payment proof rejected");
      load();
    } catch (err) {
      setError(errorMessage(err, "Could not review payment proof"));
    } finally {
      setBusy(false);
    }
  }

  if (!order && !error) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <BackLink href="/orders" label="All orders" />
        <PageHeader title="Order" />
        <ErrorBox message={error || "Order not found"} onRetry={load} />
      </div>
    );
  }

  const actions = nextActions(order);
  const isDelivery = isDeliveryFulfillment(order.fulfillment_type);
  const showProofs = order.payment_method === "bank_transfer" || (order.payment_proofs?.length ?? 0) > 0;

  return (
    <div>
      <BackLink href="/orders" label="All orders" />
      <PageHeader
        title={formatOrderNumber(order.public_id) || `Order`}
        subtitle={`${formatDateTime(order.placed_at)} · ${order.business_name} · ${order.branch_name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(order.status)}>{labelStatus(order.status)}</Badge>
            <Badge>{labelFulfillment(order.fulfillment_type)}</Badge>
            <Badge>{labelPayment(order.payment_method)}</Badge>
          </div>
        }
      />
      {error ? <ErrorBox message={error} /> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="card space-y-4 p-5">
            <h2 className="font-semibold">Items</h2>
            {!order.items?.length ? (
              <Empty title="No line items" />
            ) : (
              <div className="divide-y divide-line">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {item.quantity}× {item.product_name}
                      </p>
                      <p className="text-muted">
                        {rs(item.unit_sale_price || item.unit_base_price)} each
                        {item.unit_discount_percent && Number(item.unit_discount_percent) > 0
                          ? ` · ${Math.round(Number(item.unit_discount_percent))}% off`
                          : ""}
                        {item.product_id ? (
                          <>
                            {" · "}
                            <Link href={`/products/${item.product_id}/edit`} className="text-deal hover:underline">
                              Listing
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">{rs(item.line_total)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{rs(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delivery fee</span>
                <span>{rs(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{rs(order.total)}</span>
              </div>
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Business</h2>
            <p className="text-sm">
              <Link href={`/businesses/${order.business_id}`} className="font-semibold text-deal hover:underline">
                {order.business_name}
              </Link>
              <span className="text-muted"> · {order.branch_name}</span>
            </p>
            <p className="text-xs text-muted">
              Placed {formatDateTime(order.placed_at)} · Updated {formatDateTime(order.updated_at)}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Customer</h2>
            <p className="text-sm font-semibold">{order.customer_name || "Customer"}</p>
            {order.customer_phone ? (
              <p className="text-sm">
                <a className="font-semibold text-deal hover:underline" href={`tel:${order.customer_phone}`}>
                  {order.customer_phone}
                </a>
                {" · "}
                <a
                  className="font-semibold text-deal hover:underline"
                  href={whatsappHref(order.customer_phone)}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </p>
            ) : (
              <p className="text-sm text-muted">No phone on file</p>
            )}
            {order.customer_email ? (
              <p className="text-sm">
                <a className="text-deal hover:underline" href={`mailto:${order.customer_email}`}>
                  {order.customer_email}
                </a>
              </p>
            ) : null}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">{isDelivery ? "Delivery" : "Fulfillment"}</h2>
            <p className="text-sm">
              <span className="text-muted">Method · </span>
              {labelFulfillment(order.fulfillment_type)}
            </p>
            {order.delivery_address_text ? (
              <p className="text-sm whitespace-pre-wrap">{order.delivery_address_text}</p>
            ) : (
              <p className="text-sm text-muted">
                {isDelivery ? "No delivery address provided." : "Customer picks up at the branch."}
              </p>
            )}
            {(order.delivery_house_number || order.delivery_landmark) && (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {order.delivery_house_number ? (
                  <p>
                    <span className="text-muted">House no. · </span>
                    {order.delivery_house_number}
                  </p>
                ) : null}
                {order.delivery_landmark ? (
                  <p>
                    <span className="text-muted">Landmark · </span>
                    {order.delivery_landmark}
                  </p>
                ) : null}
              </div>
            )}
            <p className="text-sm">
              <span className="text-muted">Payment · </span>
              {labelPayment(order.payment_method)}
              {order.payment_status ? ` · ${order.payment_status}` : ""}
            </p>
            {order.delivery_snapshot?.promised_by ? (
              <p className="text-sm text-muted">
                {order.fulfillment_type === "local_same_day"
                  ? `Promised by end of day · ${formatDateTime(order.delivery_snapshot.promised_by)}`
                  : `Promised by ${formatDateTime(order.delivery_snapshot.promised_by)}${
                      order.delivery_snapshot.max_delivery_hours
                        ? ` (${order.delivery_snapshot.max_delivery_hours}h window)`
                        : ""
                    }`}
              </p>
            ) : null}
            {order.customer_notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{order.customer_notes}</p>
              </div>
            ) : null}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Actions</h2>
            <p className="text-xs text-muted">
              Admin actions are applied on behalf of the merchant and follow the same status rules.
            </p>
            {actions.length === 0 ? (
              <p className="text-sm text-muted">No further actions for this status.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {actions.map((next) => (
                  <Button
                    key={next}
                    type="button"
                    variant={next === "cancelled" ? "ghost" : "primary"}
                    disabled={busy}
                    onClick={() => void setStatus(next)}
                  >
                    {STATUS_ACTION_LABELS[next] || labelStatus(next)}
                  </Button>
                ))}
              </div>
            )}
            {actions.includes("cancelled") ? (
              <Field label="Cancel reason (optional)" hint="Shown to the customer if you cancel.">
                <input
                  className={inputClass}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Out of stock, branch closed, etc."
                />
              </Field>
            ) : null}
            {order.cancelled_at ? (
              <p className="text-sm text-muted">
                Cancelled {formatDateTime(order.cancelled_at)}
                {order.cancelled_by ? ` by ${order.cancelled_by}` : ""}
                {order.cancel_reason ? ` · ${order.cancel_reason}` : ""}
              </p>
            ) : null}
          </section>

          {showProofs ? (
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold">Payment proofs</h2>
              {order.bank_transfer_instructions ? (
                <p className="rounded-xl bg-paper p-3 text-sm whitespace-pre-wrap">
                  {order.bank_transfer_instructions}
                </p>
              ) : null}
              {!order.payment_proofs?.length ? (
                <p className="text-sm text-muted">No payment proof uploaded yet.</p>
              ) : (
                order.payment_proofs.map((proof) => (
                  <div key={proof.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        tone={
                          proof.review_status === "accepted"
                            ? "success"
                            : proof.review_status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {proof.review_status}
                      </Badge>
                      <span className="text-xs text-muted">{formatDateTime(proof.submitted_at)}</span>
                    </div>
                    {proof.file_url ? (
                      <a href={proof.file_url} target="_blank" rel="noreferrer" className="mt-2 block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.file_url}
                          alt="Payment proof"
                          className="max-h-48 rounded-lg object-contain"
                        />
                      </a>
                    ) : null}
                    {proof.note ? <p className="mt-2 text-sm text-muted">{proof.note}</p> : null}
                    {proof.review_status === "pending" ? (
                      <div className="mt-3 space-y-2">
                        <Field label="Review note">
                          <input
                            className={inputClass}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Optional note to customer"
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button type="button" disabled={busy} onClick={() => void reviewProof(proof.id, "accepted")}>
                            Accept payment
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void reviewProof(proof.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : proof.review_note ? (
                      <p className="mt-2 text-sm text-muted">Note: {proof.review_note}</p>
                    ) : null}
                  </div>
                ))
              )}
            </section>
          ) : null}

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Admin</h2>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={escalated}
                onChange={(e) => setEscalated(e.target.checked)}
              />
              Escalate
            </label>
            <Field label="Admin note">
              <textarea
                className={`${inputClass} min-h-24`}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal note for support…"
              />
            </Field>
            <Button type="button" disabled={busy} onClick={() => void saveAdminMeta()}>
              Save admin note
            </Button>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Status history</h2>
            {(order.status_history ?? []).length === 0 ? (
              <p className="text-sm text-muted">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-3 border-l border-line pl-4">
                {(order.status_history ?? []).map((ev) => (
                  <li key={ev.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-deal" />
                    <p className="font-semibold">
                      {ev.from_status ? `${ev.from_status} → ` : ""}
                      {ev.to_status}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(ev.created_at)}
                      {ev.actor_email ? ` · ${ev.actor_email}` : ""}
                    </p>
                    {ev.note ? <p className="mt-1 text-muted">{ev.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
