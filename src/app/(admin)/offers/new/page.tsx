"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OfferForm } from "@/components/OfferForm";
import { BackLink, PageHeader, Skeleton } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function NewOfferPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <NewOfferInner />
    </Suspense>
  );
}

function NewOfferInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const businessId = params.get("businessId") || undefined;

  return (
    <div>
      <BackLink href={businessId ? `/businesses/${businessId}` : "/offers"} label={t("common.back")} />
      <PageHeader
        title={t("offers.add")}
        actions={
          <Link href="/offers" className="text-sm font-semibold text-deal">
            {t("offers.title")}
          </Link>
        }
      />
      <OfferForm initialBusinessId={businessId} />
    </div>
  );
}
