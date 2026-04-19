"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button, Card, Input } from "@/components/ui";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(payload?.error || t("registerFailed"));
      }

      router.replace(`/${locale}/overview`);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : t("registerFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
      <Card padding="lg" style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <UserPlus size={28} />
          <div>
            <h1 className="text-2xl font-semibold">{t("registerTitle")}</h1>
            <p className="text-sm text-secondary">{t("registerSubtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
          <Input label={t("name")} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          <Input label={t("email")} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          <Input label={t("password")} value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required hint={t("passwordHint")} />
          <Input label={t("confirmPassword")} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <Button type="submit" loading={isSubmitting} icon={<UserPlus size={16} />} fullWidth>
            {t("createAccount")}
          </Button>
        </form>

        <p className="text-sm text-secondary mt-4">
          {t("haveAccount")} <a href={`/${locale}/login`} className="underline">{t("signIn")}</a>
        </p>
      </Card>
    </div>
  );
}