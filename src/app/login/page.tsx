"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, ErrorBox, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import type { AdminAuthPayload } from "@/lib/types";

export default function LoginPage() {
  const { t } = useI18n();
  const { status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<AdminAuthPayload>("/api/admin/auth/token", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession({ access: data.access, admin: data.admin, remember });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err, t("auth.password_required")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar px-12 py-16 text-sidebar-ink lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_20%_0%,rgba(196,95,95,0.28),transparent)]" />
        <div className="relative">
          <img src="/logo.png" alt="" className="mb-6 h-12 w-12 rounded-xl bg-white object-contain p-1" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-deal">{t("auth.brand_kicker")}</p>
          <h1 className="mt-4 max-w-sm text-4xl font-semibold tracking-tight">{t("auth.panel_title")}</h1>
        </div>
        <ul className="relative grid gap-3 text-sm text-sidebar-muted">
          <li>{t("auth.panel_1")}</li>
          <li>{t("auth.panel_2")}</li>
          <li>{t("auth.panel_3")}</li>
        </ul>
      </div>
      <div className="grid place-items-center bg-paper px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <img src="/logo.png" alt="" className="mb-3 h-12 w-12 rounded-xl" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-deal">{t("auth.brand_kicker")}</p>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{t("auth.admin_login")}</h2>
          <p className="mt-2 mb-6 text-sm text-muted">{t("auth.admin_login_subtitle")}</p>
          <form onSubmit={submit} className="card space-y-4 p-6">
            {error ? <ErrorBox message={error} /> : null}
            <Field label={t("auth.email")}>
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            <Field label={t("auth.password")}>
              <div className="relative">
                <input
                  className={`${inputClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t("auth.remember_me")}
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.signing_in") : t("auth.sign_in")}
            </Button>
            <p className="text-center text-xs text-muted">{t("auth.staff_only")}</p>
          </form>
        </div>
      </div>
    </div>
  );
}
