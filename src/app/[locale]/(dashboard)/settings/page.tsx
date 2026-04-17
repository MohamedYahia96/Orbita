"use client";

import { Card } from "@/components/ui";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("Settings");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "800px" }}>
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      
      <Card title={t("profileTitle")} padding="lg">
        <p className="text-secondary mb-4">{t("profileDesc")}</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>
      
      <Card title={t("integrationsTitle")} padding="lg">
        <p className="text-secondary mb-4">{t("integrationsDesc")}</p>
        <div style={{ height: "40px", width: "100%", background: "var(--color-bg-hover)", borderRadius: "var(--radius-sm)" }}></div>
      </Card>
    </div>
  );
}
