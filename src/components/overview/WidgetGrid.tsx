"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  BookMarked,
  GitBranch,
  Link2,
  Mail,
  RefreshCw,
  ScrollText,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button, Card } from "@/components/ui";
import {
  DASHBOARD_WIDGET_IDS,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";
import styles from "./WidgetGrid.module.css";

type FeedSummary = {
  id: string;
  title: string;
  url?: string | null;
  type: string;
  platform?: string | null;
};

type TimelineEntry = {
  id: string;
  title: string;
  createdAt?: string;
  feed?: {
    title?: string | null;
  } | null;
};

type NotificationEntry = {
  id: string;
  title: string;
  createdAt?: string;
};

type DashboardData = {
  timeline: TimelineEntry[];
  notifications: NotificationEntry[];
  unreadNotifications: number;
  digestUnread: number;
  savedItems: number;
  gmailFeeds: number;
  githubFeeds: number;
  quickLinks: Array<{ id: string; title: string; url: string }>;
  sportsMatches: number;
  sportsLiveMatches: number;
};

type WidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  icon: ReactNode;
  content: ReactNode;
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  timeline: [],
  notifications: [],
  unreadNotifications: 0,
  digestUnread: 0,
  savedItems: 0,
  gmailFeeds: 0,
  githubFeeds: 0,
  quickLinks: [],
  sportsMatches: 0,
  sportsLiveMatches: 0,
};

const WIDGET_SPAN_CLASS_NAMES: Record<DashboardWidgetId, string> = {
  activity: styles.widgetSpan8,
  notifications: styles.widgetSpan4,
  sports: styles.widgetSpan4,
  email: styles.widgetSpan4,
  git: styles.widgetSpan4,
  digest: styles.widgetSpan4,
  saved: styles.widgetSpan6,
  quickLinks: styles.widgetSpan6,
};

function formatDateTime(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString();
}

export function WidgetGrid() {
  const t = useTranslations("Overview");

  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshWidgetsData = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [feedsRes, notificationsRes, digestRes, readingListRes, timelineRes, sportsRes] =
        await Promise.all([
          fetch("/api/feeds", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
          fetch("/api/digest", { cache: "no-store" }),
          fetch("/api/reading-list", { cache: "no-store" }),
          fetch("/api/timeline", { cache: "no-store" }),
          fetch("/api/sports/today?limit=10", { cache: "no-store" }),
        ]);

      const feedsPayload = (await feedsRes.json().catch(() => null)) as FeedSummary[] | null;
      const notificationsPayload = (await notificationsRes.json().catch(() => null)) as
        | {
            count?: number;
            notifications?: NotificationEntry[];
          }
        | null;
      const digestPayload = (await digestRes.json().catch(() => null)) as
        | {
            digest?: {
              total?: number;
            };
          }
        | null;
      const readingListPayload = (await readingListRes.json().catch(() => null)) as unknown;
      const timelinePayload = (await timelineRes.json().catch(() => null)) as
        | {
            timeline?: TimelineEntry[];
          }
        | null;
      const sportsPayload = (await sportsRes.json().catch(() => null)) as
        | {
            matches?: Array<{
              status?: string;
            }>;
          }
        | null;

      const feeds = Array.isArray(feedsPayload) ? feedsPayload : [];
      const notifications = Array.isArray(notificationsPayload?.notifications)
        ? notificationsPayload.notifications.slice(0, 6)
        : [];
      const timeline = Array.isArray(timelinePayload?.timeline)
        ? timelinePayload.timeline.slice(0, 6)
        : [];

      const digestUnread =
        typeof digestPayload?.digest?.total === "number" ? digestPayload.digest.total : 0;
      const savedItems = Array.isArray(readingListPayload) ? readingListPayload.length : 0;
      const unreadNotifications =
        typeof notificationsPayload?.count === "number"
          ? notificationsPayload.count
          : notifications.length;

      const gmailFeeds = feeds.filter((feed) => feed.platform === "gmail").length;
      const githubFeeds = feeds.filter((feed) => feed.platform === "github").length;

      const quickLinks = feeds
        .filter(
          (feed): feed is FeedSummary & { url: string } =>
            feed.type === "custom_link" && typeof feed.url === "string" && feed.url.length > 0
        )
        .slice(0, 6)
        .map((feed) => ({
          id: feed.id,
          title: feed.title,
          url: feed.url,
        }));

      const sportsMatches = Array.isArray(sportsPayload?.matches) ? sportsPayload.matches : [];
      const sportsLiveMatches = sportsMatches.filter((match) => match.status === "LIVE").length;

      setDashboardData({
        timeline,
        notifications,
        unreadNotifications,
        digestUnread,
        savedItems,
        gmailFeeds,
        githubFeeds,
        quickLinks,
        sportsMatches: sportsMatches.length,
        sportsLiveMatches,
      });
    } catch {
      setDashboardData((current) => current);
    } finally {
      if (manualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshWidgetsData(false);
  }, [refreshWidgetsData]);

  const widgetDefinitions = useMemo<Record<DashboardWidgetId, WidgetDefinition>>(
    () => ({
      activity: {
        id: "activity",
        title: t("widgetFeedActivityTitle"),
        description: t("widgetFeedActivityDesc"),
        icon: <Activity size={15} />,
        content:
          dashboardData.timeline.length > 0 ? (
            <div className={styles.itemList}>
              {dashboardData.timeline.map((entry) => (
                <div key={entry.id} className={styles.item}>
                  <span className={styles.itemTitle}>{entry.title}</span>
                  <span className={styles.itemMeta}>{formatDateTime(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.placeholder}>{t("widgetNoData")}</p>
          ),
      },
      notifications: {
        id: "notifications",
        title: t("widgetNotificationsTitle"),
        description: t("widgetNotificationsDesc"),
        icon: <Bell size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.unreadNotifications}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetNotificationsUnread", { count: dashboardData.unreadNotifications })}
            </p>
            {dashboardData.notifications.length > 0 ? (
              <div className={styles.itemList}>
                {dashboardData.notifications.slice(0, 3).map((entry) => (
                  <div key={entry.id} className={styles.item}>
                    <span className={styles.itemTitle}>{entry.title}</span>
                    <span className={styles.itemMeta}>{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Link href="/notifications" className={styles.inlineLink}>
              {t("widgetOpenNotifications")}
            </Link>
          </>
        ),
      },
      sports: {
        id: "sports",
        title: t("widgetSportsTitle"),
        description: t("widgetSportsDesc"),
        icon: <Trophy size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.sportsMatches}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetSportsMatches", { count: dashboardData.sportsMatches })}
            </p>
            <p className={styles.widgetSubMetric}>
              {t("widgetSportsLive", { count: dashboardData.sportsLiveMatches })}
            </p>
          </>
        ),
      },
      email: {
        id: "email",
        title: t("widgetEmailTitle"),
        description: t("widgetEmailDesc"),
        icon: <Mail size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.gmailFeeds}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetEmailSources", { count: dashboardData.gmailFeeds })}
            </p>
            <Link href="/feeds" className={styles.inlineLink}>
              {t("widgetOpenFeeds")}
            </Link>
          </>
        ),
      },
      git: {
        id: "git",
        title: t("widgetGitTitle"),
        description: t("widgetGitDesc"),
        icon: <GitBranch size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.githubFeeds}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetGitSources", { count: dashboardData.githubFeeds })}
            </p>
            <Link href="/feeds" className={styles.inlineLink}>
              {t("widgetOpenFeeds")}
            </Link>
          </>
        ),
      },
      digest: {
        id: "digest",
        title: t("widgetDigestTitle"),
        description: t("widgetDigestDesc"),
        icon: <ScrollText size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.digestUnread}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetDigestUnread", { count: dashboardData.digestUnread })}
            </p>
            <Link href="/digest" className={styles.inlineLink}>
              {t("widgetOpenDigest")}
            </Link>
          </>
        ),
      },
      saved: {
        id: "saved",
        title: t("widgetSavedTitle"),
        description: t("widgetSavedDesc"),
        icon: <BookMarked size={15} />,
        content: (
          <>
            <p className={styles.widgetMetric}>{dashboardData.savedItems}</p>
            <p className={styles.widgetSubMetric}>
              {t("widgetSavedItems", { count: dashboardData.savedItems })}
            </p>
            <Link href="/reading-list" className={styles.inlineLink}>
              {t("widgetOpenReadingList")}
            </Link>
          </>
        ),
      },
      quickLinks: {
        id: "quickLinks",
        title: t("widgetQuickLinksTitle"),
        description: t("widgetQuickLinksDesc"),
        icon: <Link2 size={15} />,
        content:
          dashboardData.quickLinks.length > 0 ? (
            <div className={styles.itemList}>
              {dashboardData.quickLinks.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  className={styles.inlineLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
              ))}
            </div>
          ) : (
            <>
              <p className={styles.placeholder}>{t("widgetNoQuickLinks")}</p>
              <Link href="/feeds" className={styles.inlineLink}>
                {t("widgetOpenFeeds")}
              </Link>
            </>
          ),
      },
    }),
    [dashboardData, t]
  );

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{t("dashboardWidgetsTitle")}</h2>
          <p className={styles.subtitle}>{t("dashboardWidgetsDesc")}</p>
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
            onClick={() => void refreshWidgetsData(true)}
            loading={isRefreshing}
            disabled={isLoading}
          >
            {t("dashboardRefreshData")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card padding="md" variant="glass">
          <p>{t("dashboardLayoutLoading")}</p>
        </Card>
      ) : (
        <div className={styles.gridRoot}>
          <div className={styles.fixedGrid}>
            {DASHBOARD_WIDGET_IDS.map((widgetId) => {
              const widget = widgetDefinitions[widgetId];
              return (
                <div
                  key={widget.id}
                  className={`${styles.widgetGridItem} ${WIDGET_SPAN_CLASS_NAMES[widget.id]}`}
                >
                  <article className={styles.widgetShell}>
                    <header className={styles.widgetHeader}>
                      <span className={styles.widgetTitle}>
                        <span className={styles.widgetIcon}>{widget.icon}</span>
                        <span className={styles.widgetLabel}>{widget.title}</span>
                      </span>
                    </header>

                    <div className={styles.widgetBody}>
                      <p className={styles.widgetDescription}>{widget.description}</p>
                      {widget.content}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
