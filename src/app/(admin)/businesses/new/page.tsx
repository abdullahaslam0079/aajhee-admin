"use client";

import { BusinessForm } from "@/components/BusinessForm";
import { BackLink, PageHeader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function NewBusinessPage() {
  const { t } = useI18n();
  return (
    <div>
      <BackLink href="/businesses" label={t("common.back")} />
      <PageHeader title={t("businesses.create")} />
      <BusinessForm />
    </div>
  );
}
