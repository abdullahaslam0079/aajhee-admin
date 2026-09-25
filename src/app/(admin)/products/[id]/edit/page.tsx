"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductForm, type AdminProduct } from "@/components/ProductForm";
import { BackLink, Button, ConfirmDialog, ErrorBox, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/lib/toast";

export default function EditListingPage({
  params,
}: PageProps<"/products/[id]/edit">) {
  const { id } = use(params);
  const toast = useToast();
  const router = useRouter();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api<AdminProduct>(`/api/admin/products/${id}`, { auth: true })
      .then(setProduct)
      .catch((err) => setError(errorMessage(err, "Could not load listing")));
  }, [id]);

  async function remove() {
    try {
      await api(`/api/admin/products/${id}`, { method: "DELETE", auth: true });
      toast.push("Listing deleted");
      router.push("/products");
    } catch (err) {
      toast.push(errorMessage(err, "Could not delete listing"), "error");
    }
  }

  return (
    <div>
      <BackLink href="/products" label="Back" />
      <PageHeader
        title="Edit listing"
        actions={
          <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
            Delete
          </Button>
        }
      />
      {error ? <ErrorBox message={error} /> : null}
      {product ? <ProductForm product={product} /> : <Skeleton className="h-80" />}
      {confirm ? (
        <ConfirmDialog
          title="Delete listing"
          message="Remove this product listing from the catalog?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
