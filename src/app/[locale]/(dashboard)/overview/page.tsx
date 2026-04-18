"use client";

import { Card, Button } from "@/components/ui";
import { OnboardingWizard } from "@/components/overview/OnboardingWizard";
import { WidgetGrid } from "@/components/overview/WidgetGrid";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function OverviewPage() {
  const t = useTranslations("Overview");
  const router = useRouter();
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">{t("activeFeeds")}</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </Card>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">{t("unreadNotifs")}</h3>
          <p className="text-3xl font-bold mt-2 text-accent">3</p>
        </Card>
        <Card padding="md" variant="glass">
          <h3 className="text-secondary text-sm">{t("workspaces")}</h3>
          <p className="text-3xl font-bold mt-2">4</p>
        </Card>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">{t("quickActions")}</h2>
        <Card
          padding="md"
          style={{
            display: "flex",
            gap: "var(--space-3)",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/workspaces")}
            >
              {t("createWorkspace")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/feeds")}
            >
              {t("manageSources")}
            </Button>
          </div>
          <OnboardingWizard />
        </Card>
      </section>

      <WidgetGrid />
    </div>
  );
}
