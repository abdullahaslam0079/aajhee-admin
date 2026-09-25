import { redirect } from "next/navigation";

export default async function NewOfferRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const q = await searchParams;
  redirect(q.businessId ? `/products/new?businessId=${q.businessId}` : "/products/new");
}
