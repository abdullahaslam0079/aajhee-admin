"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/OfferForm";
import { BackLink, Button, ConfirmDialog, ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminOffer } from "@/lib/types";

export default function EditOfferPage({ params }: PageProps<"/offers/[id]/edit">) {
  const { id } = use(params);
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api<AdminOffer>(`/api/admin/offers/${id}`, { auth: true })
      .then(setOffer)
      .catch((err) => setError(errorMessage(err, t("offers.not_found"))));
  }, [id, t]);

  async function remove() {
    try {
      await api(`/api/admin/offers/${id}`, { method: "DELETE", auth: true });
      toast.push(t("offers.deleted"));
      router.push("/offers");
    } catch (err) {
      toast.push(errorMessage(err, t("offers.delete_error")), "error");
    }
  }

  return (
    <div>
      <BackLink href={`/offers/${id}`} label={t("common.back")} />
      <PageHeader
        title={t("offers.edit")}
        actions={
          <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
            {t("offers.delete")}
          </Button>
        }
      />
      {error ? <ErrorBox message={error} /> : null}
      {offer ? <OfferForm offer={offer} /> : <Skeleton className="h-80" />}
      {confirm ? (
        <ConfirmDialog
          title={t("offers.delete_title")}
          message={t("offers.delete_message")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
