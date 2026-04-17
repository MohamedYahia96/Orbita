"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Menu,
  Moon,
  Sun,
  Search,
  Languages,
} from "lucide-react";
import { Input, Avatar, Badge, Button } from "@/components/ui";
import styles from "./Header.module.css";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tSidebar = useTranslations("Sidebar");

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPageTitle = () => {
    const path = pathname?.split('/').pop() || "overview";
    try {
      return tSidebar(path as any);
    } catch {
      return path.charAt(0).toUpperCase() + path.slice(1);
    }
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

          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            />
          )}

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
