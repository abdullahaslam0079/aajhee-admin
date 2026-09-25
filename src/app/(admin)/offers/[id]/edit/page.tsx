import { redirect } from "next/navigation";

export default function OfferEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  redirect("/products");
}
