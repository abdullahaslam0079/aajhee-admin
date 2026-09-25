"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackLink, PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/ProductForm";

export default function NewListingPage() {
  const params = useSearchParams();
  const businessId = params.get("businessId") || undefined;
  return (
    <div>
      <BackLink href={businessId ? `/businesses/${businessId}` : "/products"} label="Back" />
      <PageHeader
        title="Create listing"
        subtitle="Add a product with photos from gallery or camera"
        actions={
          <Link href="/products" className="text-sm font-semibold text-deal">
            All listings
          </Link>
        }
      />
      <ProductForm initialBusinessId={businessId} />
    </div>
  );
}
