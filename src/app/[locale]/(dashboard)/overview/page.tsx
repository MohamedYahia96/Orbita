"use client";

import { Card, EmptyState, Button } from "@/components/ui";
import { CopyPlus } from "lucide-react";
import { ActivityTimeline } from "@/components/overview/ActivityTimeline";
import { useTranslations } from "next-intl";

export default function OverviewPage() {
  const t = useTranslations("Overview");
  
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

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>
        {/* Main Feed Activity Timeline */}
        <section>
           <ActivityTimeline />
        </section>

        {/* Sidebar / Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t("quickActions")}</h2>
          <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
             <Button fullWidth variant="secondary">{t("createWorkspace")}</Button>
             <Button fullWidth variant="ghost">{t("manageSources")}</Button>
          </Card>
        </section>
      </div>
    </div>
  );
}
