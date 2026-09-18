"use client";

import { use, useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OfferForm } from "@/components/OfferForm";
import { ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { AdminOffer } from "@/lib/types";

export default function EditOfferPage({ params }: PageProps<"/offers/[id]/edit">) {
  const { id } = use(params);
  const { t } = useI18n();
  const [offer, setOffer] = useState<AdminOffer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AdminOffer>(`/api/admin/offers/${id}`, { auth: true })
      .then(setOffer)
      .catch((err) => setError(errorMessage(err, t("offers.not_found"))));
  }, [id, t]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: "/offers", label: t("offers.title") },
          { href: `/offers/${id}`, label: offer?.title || t("offers.detail_title") },
          { label: t("common.edit") },
        ]}
      />
      <PageHeader title={t("offers.edit")} />
      {error ? <ErrorBox message={error} /> : null}
      {offer ? <OfferForm offer={offer} /> : <Skeleton className="h-80" />}
    </div>
  );
}
