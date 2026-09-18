"use client";

import { use } from "react";
import { BranchForm } from "@/components/BranchForm";
import { BackLink, PageHeader } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function NewBranchPage({ params }: PageProps<"/businesses/[id]/branches/new">) {
  const { id } = use(params);
  const { t } = useI18n();
  return (
    <div>
      <BackLink href={`/businesses/${id}`} label={t("common.back")} />
      <PageHeader title={t("branches.create")} />
      <BranchForm businessId={id} />
    </div>
  );
}
