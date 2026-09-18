"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchForm } from "@/components/BranchForm";
import { BackLink, Button, ConfirmDialog, ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import type { AdminBranch } from "@/lib/types";

export default function EditBranchPage({
  params,
}: PageProps<"/businesses/[id]/branches/[branchId]/edit">) {
  const { id, branchId } = use(params);
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [branch, setBranch] = useState<AdminBranch | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api<AdminBranch>(`/api/admin/branches/${branchId}`, { auth: true })
      .then(setBranch)
      .catch((err) => setError(errorMessage(err, t("branches.load_error"))));
  }, [branchId, t]);

  async function remove() {
    try {
      await api(`/api/admin/branches/${branchId}`, { method: "DELETE", auth: true });
      toast.push(t("branches.deleted"));
      router.push(`/businesses/${id}`);
    } catch (err) {
      toast.push(errorMessage(err, t("branches.delete_error")), "error");
    }
  }

  return (
    <div>
      <BackLink href={`/businesses/${id}`} label={t("common.back")} />
      <PageHeader
        title={t("branches.edit")}
        actions={
          <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
            {t("common.delete")}
          </Button>
        }
      />
      {error ? <ErrorBox message={error} /> : null}
      {branch ? <BranchForm businessId={id} branch={branch} /> : <Skeleton className="h-80" />}
      {confirm ? (
        <ConfirmDialog
          title={t("branches.delete_title")}
          message={t("branches.delete_message")}
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
