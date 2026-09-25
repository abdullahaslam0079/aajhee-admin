"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/lib/toast";
import type { BranchContact, BranchFulfillmentSettings } from "@/lib/types";
import { Button, ErrorBox, Field, Skeleton, inputClass } from "./ui";

const CONTACT_TYPES = [
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
] as const;

const emptyContact = (): BranchContact => ({
  contact_type: "phone",
  value: "",
  is_primary: true,
});

const defaultFulfillment = (): BranchFulfillmentSettings => ({
  pickup_enabled: true,
  pickup_radius_km: "15.00",
  local_same_day_enabled: true,
  local_delivery_fee: "0.00",
  local_max_delivery_hours: 24,
  nationwide_enabled: false,
  nationwide_delivery_fee: "0.00",
  nationwide_max_delivery_hours: 72,
  customer_cancel_policy: "window_minutes",
  customer_cancel_window_minutes: 30,
  bank_transfer_enabled: false,
  bank_transfer_instructions: "",
  cash_on_pickup_enabled: true,
  cash_on_delivery_enabled: true,
});

export function BranchCommercePanel({ branchId }: { branchId: number }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<BranchContact[]>([emptyContact()]);
  const [fulfillment, setFulfillment] = useState<BranchFulfillmentSettings>(defaultFulfillment());

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api<BranchContact[]>(`/api/admin/branches/${branchId}/contacts`, { auth: true }),
      api<BranchFulfillmentSettings>(`/api/admin/branches/${branchId}/fulfillment`, {
        auth: true,
      }),
    ])
      .then(([contactData, fulfillmentData]) => {
        setContacts(Array.isArray(contactData) && contactData.length ? contactData : [emptyContact()]);
        setFulfillment({ ...defaultFulfillment(), ...(fulfillmentData || {}) });
      })
      .catch((err) => {
        setError(
          err instanceof ApiError && err.status === 404
            ? "Branch commerce API is not live yet. Redeploy aajhee-backend on Render, then refresh this page."
            : errorMessage(err, "Could not load branch commerce settings"),
        );
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const cleaned = contacts
        .map((c) => ({
          contact_type: c.contact_type,
          value: c.value.trim(),
          is_primary: Boolean(c.is_primary),
        }))
        .filter((c) => c.value);
      if (!cleaned.length) {
        setError("Add at least one contact (phone, WhatsApp, or email) before saving.");
        setSaving(false);
        return;
      }
      await api(`/api/admin/branches/${branchId}/contacts`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify(cleaned),
      });
      await api(`/api/admin/branches/${branchId}/fulfillment`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          ...fulfillment,
          pickup_radius_km: String(fulfillment.pickup_radius_km),
          local_delivery_fee: String(fulfillment.local_delivery_fee),
          nationwide_delivery_fee: String(fulfillment.nationwide_delivery_fee),
        }),
      });
      toast.push("Contacts and delivery settings saved");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "Save failed: branch commerce API is not live yet. Redeploy aajhee-backend on Render."
          : errorMessage(err, "Could not save commerce settings"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="mt-6 h-64 w-full" />;

  return (
    <div className="card mx-auto mt-6 max-w-2xl space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">Contacts & delivery</h2>
        <p className="text-sm text-muted">
          Customer-facing contact options, fulfillment, payments, and cancel policy for this branch.
        </p>
      </div>
      {error ? <ErrorBox message={error} /> : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Contacts</h3>
        {contacts.map((contact, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr_auto_auto]">
            <select
              className={inputClass}
              value={contact.contact_type}
              onChange={(e) => {
                const next = [...contacts];
                next[index] = {
                  ...contact,
                  contact_type: e.target.value as BranchContact["contact_type"],
                };
                setContacts(next);
              }}
            >
              {CONTACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              value={contact.value}
              placeholder="Value"
              onChange={(e) => {
                const next = [...contacts];
                next[index] = { ...contact, value: e.target.value };
                setContacts(next);
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(contact.is_primary)}
                onChange={(e) => {
                  const next = contacts.map((c, i) => ({
                    ...c,
                    is_primary: i === index ? e.target.checked : false,
                  }));
                  setContacts(next);
                }}
              />
              Primary
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={() => setContacts([...contacts, emptyContact()])}>
          Add contact
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fulfillment.pickup_enabled}
            onChange={(e) => setFulfillment({ ...fulfillment, pickup_enabled: e.target.checked })}
          />
          Pickup enabled
        </label>
        <Field label="Pickup radius (km)">
          <input
            className={inputClass}
            value={fulfillment.pickup_radius_km}
            onChange={(e) => setFulfillment({ ...fulfillment, pickup_radius_km: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fulfillment.local_same_day_enabled}
            onChange={(e) =>
              setFulfillment({ ...fulfillment, local_same_day_enabled: e.target.checked })
            }
          />
          Local / same-day delivery
        </label>
        <Field label="Local delivery fee">
          <input
            className={inputClass}
            value={fulfillment.local_delivery_fee}
            onChange={(e) => setFulfillment({ ...fulfillment, local_delivery_fee: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fulfillment.nationwide_enabled}
            onChange={(e) => setFulfillment({ ...fulfillment, nationwide_enabled: e.target.checked })}
          />
          Nationwide delivery
        </label>
        <Field label="Nationwide fee">
          <input
            className={inputClass}
            value={fulfillment.nationwide_delivery_fee}
            onChange={(e) =>
              setFulfillment({ ...fulfillment, nationwide_delivery_fee: e.target.value })
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fulfillment.cash_on_pickup_enabled}
            onChange={(e) =>
              setFulfillment({ ...fulfillment, cash_on_pickup_enabled: e.target.checked })
            }
          />
          Cash on pickup
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fulfillment.cash_on_delivery_enabled}
            onChange={(e) =>
              setFulfillment({ ...fulfillment, cash_on_delivery_enabled: e.target.checked })
            }
          />
          Cash on delivery
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={fulfillment.bank_transfer_enabled}
            onChange={(e) =>
              setFulfillment({ ...fulfillment, bank_transfer_enabled: e.target.checked })
            }
          />
          Bank transfer (with payment proof)
        </label>
        {fulfillment.bank_transfer_enabled ? (
          <Field label="Bank transfer instructions">
            <textarea
              className={inputClass}
              rows={3}
              value={fulfillment.bank_transfer_instructions}
              onChange={(e) =>
                setFulfillment({ ...fulfillment, bank_transfer_instructions: e.target.value })
              }
            />
          </Field>
        ) : null}
        <Field label="Customer cancel policy">
          <select
            className={inputClass}
            value={fulfillment.customer_cancel_policy}
            onChange={(e) =>
              setFulfillment({
                ...fulfillment,
                customer_cancel_policy: e.target.value as BranchFulfillmentSettings["customer_cancel_policy"],
              })
            }
          >
            <option value="disabled">Customer cannot cancel</option>
            <option value="window_minutes">Cancel within window</option>
          </select>
        </Field>
        {fulfillment.customer_cancel_policy === "window_minutes" ? (
          <Field label="Cancel window (minutes)">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={fulfillment.customer_cancel_window_minutes}
              onChange={(e) =>
                setFulfillment({
                  ...fulfillment,
                  customer_cancel_window_minutes: Number(e.target.value) || 30,
                })
              }
            />
          </Field>
        ) : null}
      </div>

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save contacts & delivery"}
      </Button>
    </div>
  );
}
