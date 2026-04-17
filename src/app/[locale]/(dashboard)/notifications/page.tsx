"use client";

import { EmptyState, Button } from "@/components/ui";
import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotificationsPage() {
  const t = useTranslations("Notifications");

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EmptyState 
        icon={<BellRing size={48} />}
        title={t("noNotifications")}
        description={t("noNotificationsDesc")}
        action={<Button variant="ghost">{t("settingsBtn")}</Button>}
      />
    </div>
  );
}
