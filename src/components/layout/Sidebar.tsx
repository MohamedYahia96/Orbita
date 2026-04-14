"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  LayoutGrid,
  Rss,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Tag as TagIcon,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import styles from "./Sidebar.module.css";

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const NAV_ITEMS = [
    { href: "/overview", label: t("overview"), icon: <LayoutDashboard size={20} /> },
    { href: "/feeds", label: t("feeds"), icon: <Rss size={20} /> },
    { href: "/workspaces", label: t("workspaces"), icon: <LayoutGrid size={20} /> },
    { href: "/reading-list", label: t("readingList"), icon: <Bookmark size={20} /> },
    { href: "/tags", label: t("tags"), icon: <TagIcon size={20} /> },
    { href: "/notifications", label: t("notifications"), icon: <Bell size={20} /> },
    { href: "/settings", label: t("settings"), icon: <Settings size={20} /> },
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Brand Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoOrb}></span>
          </div>
          {!collapsed && <span className={styles.brandName}>Orbita</span>}
        </div>
        <button
          className={styles.toggleBtn}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.endsWith(item.href) || (pathname.endsWith('/') && item.href === '/overview');
            const linkContent = (
              <Link
                href={item.href as any}
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              >
                <div className={styles.navIcon}>{item.icon}</div>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip content={item.label} position="right">
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
