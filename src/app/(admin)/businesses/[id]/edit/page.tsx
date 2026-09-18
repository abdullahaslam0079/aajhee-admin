"use client";

import { use, useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BusinessForm } from "@/components/BusinessForm";
import { ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { AdminBusiness } from "@/lib/types";

export default function EditBusinessPage({ params }: PageProps<"/businesses/[id]/edit">) {
  const { id } = use(params);
  const { t } = useI18n();
  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AdminBusiness>(`/api/admin/businesses/${id}`, { auth: true })
      .then(setBusiness)
      .catch((err) => setError(errorMessage(err, t("businesses.not_found"))));
  }, [id, t]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: "/businesses", label: t("businesses.title") },
          { href: `/businesses/${id}`, label: business?.name || t("businesses.detail_title") },
          { label: t("common.edit") },
        ]}
      />
      <PageHeader title={t("businesses.edit")} />
      {error ? <ErrorBox message={error} /> : null}
      {business ? <BusinessForm business={business} /> : <Skeleton className="h-80" />}
    </div>
  );
}
