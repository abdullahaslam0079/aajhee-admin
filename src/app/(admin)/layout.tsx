"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}
