"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button, Card, Input } from "@/components/ui";
import { LogIn, Shield } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("demo@orbita.local");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          router.replace(`/${locale}/overview`);
        }
      })
      .catch(() => undefined);
  }, [locale, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(payload?.error || t("loginFailed"));
      }

      router.replace(`/${locale}/overview`);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : t("loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
      <Card padding="lg" style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <Shield size={28} />
          <div>
            <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
            <p className="text-sm text-secondary">{t("loginSubtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
          <Input label={t("email")} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          <Input label={t("password")} value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button type="submit" loading={isSubmitting} icon={<LogIn size={16} />} fullWidth>
            {t("signIn")}
          </Button>
        </form>

        <p className="text-sm text-secondary mt-4">
          {t("noAccount")} <a href={`/${locale}/register`} className="underline">{t("createAccount")}</a>
        </p>

        <p className="text-xs text-secondary mt-3">{t("demoHint")}</p>
      </Card>
    </div>
  );
}