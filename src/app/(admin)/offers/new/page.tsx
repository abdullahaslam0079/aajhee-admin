"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OfferForm } from "@/components/OfferForm";
import { BackLink, PageHeader, Skeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

function NewOfferInner() {
  const { t } = useI18n();
  const search = useSearchParams();
  const businessId = search.get("businessId") || undefined;
  return (
    <div>
      <BackLink href="/offers" label={t("common.back")} />
      <PageHeader title={t("offers.create")} />
      <OfferForm initialBusinessId={businessId} />
    </div>
  );
}

export default function NewOfferPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <NewOfferInner />
    </Suspense>
  );
}
