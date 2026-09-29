import type { AdminProfile } from "./types";

export function isAdminOwner(admin?: AdminProfile | null): boolean {
  if (!admin) return false;
  if (admin.is_superuser) return true;
  return (admin.admin_role || "owner") !== "support";
}

export function canWriteAdmin(
  admin: AdminProfile | null | undefined,
  area: "orders" | "reports" | "other",
): boolean {
  if (!admin) return false;
  if (isAdminOwner(admin)) return true;
  return area === "orders" || area === "reports";
}
