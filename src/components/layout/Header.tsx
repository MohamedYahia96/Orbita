"use client";

import { useTheme } from "next-themes";
import {
  Menu,
  Moon,
  Sun,
  Search,
  Languages,
} from "lucide-react";
import { Input, Avatar, Button } from "@/components/ui";
import styles from "./Header.module.css";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FocusModeControl } from "@/components/focus/FocusModeControl";

export default function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tSidebar = useTranslations("Sidebar");

  const getPageTitle = () => {
    const path = pathname?.split('/').pop() || "overview";
    const titleMap: Record<string, string> = {
      overview: "overview",
      feeds: "feeds",
      workspaces: "workspaces",
      "reading-list": "readingList",
      tags: "tags",
      digest: "digest",
      notifications: "notifications",
      status: "status",
      analytics: "analytics",
      settings: "settings",
    };

    const translatedKey = titleMap[path];
    try {
      if (translatedKey) {
        return tSidebar(translatedKey as Parameters<typeof tSidebar>[0]);
      }
    } catch {
      // Fallback to a formatted segment when translation key is missing.
    }

    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "ar" : "en";
    const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
    router.replace(pathWithoutLocale as "/overview", { locale: nextLocale });
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Button variant="ghost" size="sm" icon={<Menu size={20} />} className={styles.mobileMenuBtn} aria-label="Menu" />
        <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
      </div>

      <div className={styles.center}>
        <div className={styles.searchWrap}>
          <Input 
            placeholder={t("searchPlaceholder")}
            icon={<Search size={16} />}
            inputSize="sm"
            style={{ minWidth: "300px" }}
          />
        </div>
      </div>

      <div className={styles.right}>
        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" icon={<Languages size={18} />} onClick={toggleLocale} aria-label="Toggle language" />

          <Button
            variant="ghost"
            size="sm"
            icon={resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            onClick={() => setTheme((resolvedTheme || theme) === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          />

          <FocusModeControl />

          <div className={styles.notifWrap}>
            <NotificationBell />
          </div>
        </div>

        {/* User Profile */}
        <div className={styles.profile}>
          <Avatar name="Yahia M." size="sm" />
        </div>
      </div>
    </header>
  );
}
