"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactGridLayout from "react-grid-layout";
import {
  Activity,
  Bell,
  BookMarked,
  GitBranch,
  GripVertical,
  Link2,
  Mail,
  RefreshCw,
  ScrollText,
  Trash2,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button, Card } from "@/components/ui";
import {
  DASHBOARD_WIDGET_IDS,
  type DashboardLayoutItem,
  type DashboardLayoutState,
  type DashboardWidgetId,
  createDefaultDashboardLayout,
  getDefaultLayoutItem,
  sanitizeDashboardLayout,
} from "@/lib/dashboard-layout";
import styles from "./WidgetGrid.module.css";

type GridLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

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

function toGridLayout(items: DashboardLayoutItem[]): GridLayoutItem[] {
  return items.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
  }));
}

export function WidgetGrid() {
  const t = useTranslations("Overview");

  const [layoutState, setLayoutState] = useState<DashboardLayoutState>(() => createDefaultDashboardLayout());
  const [layoutReady, setLayoutReady] = useState(false);
  const [layoutStatus, setLayoutStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gridWidth, setGridWidth] = useState(1200);

  const lastPersistedLayoutRef = useRef<string>("");
  const gridRootRef = useRef<HTMLDivElement | null>(null);

  const updateLayoutState = useCallback(
    (updater: (current: DashboardLayoutState) => DashboardLayoutState) => {
      setLayoutState((current) => {
        const next = sanitizeDashboardLayout(updater(current));
        const currentSerialized = JSON.stringify(current);
        const nextSerialized = JSON.stringify(next);

        return currentSerialized === nextSerialized ? current : next;
      });
    },
    []
  );

  const refreshWidgetsData = useCallback(async () => {
    setIsRefreshing(true);

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
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLayout = async () => {
      try {
        const response = await fetch("/api/users/layout", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as unknown;
        const normalizedLayout = sanitizeDashboardLayout(payload);

        if (cancelled) {
          return;
        }

        setLayoutState(normalizedLayout);
        lastPersistedLayoutRef.current = JSON.stringify(normalizedLayout);
      } catch {
        if (cancelled) {
          return;
        }

        const fallback = createDefaultDashboardLayout();
        setLayoutState(fallback);
        lastPersistedLayoutRef.current = JSON.stringify(fallback);
      } finally {
        if (!cancelled) {
          setLayoutReady(true);
        }
      }
    };

    void loadLayout();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshWidgetsData();
  }, [refreshWidgetsData]);

  useEffect(() => {
    const rootElement = gridRootRef.current;
    if (!rootElement) {
      return;
    }

    const updateWidth = () => {
      setGridWidth(Math.max(320, rootElement.clientWidth));
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(rootElement);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!layoutReady) {
      return;
    }

    const serializedLayout = JSON.stringify(layoutState);
    if (serializedLayout === lastPersistedLayoutRef.current) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setLayoutStatus("saving");
      try {
        const response = await fetch("/api/users/layout", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: serializedLayout,
        });

        if (!response.ok) {
          throw new Error("layout_save_failed");
        }

        lastPersistedLayoutRef.current = serializedLayout;
        setLayoutStatus("saved");

        window.setTimeout(() => {
          setLayoutStatus((current) => (current === "saved" ? "idle" : current));
        }, 1400);
      } catch {
        setLayoutStatus("error");
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [layoutReady, layoutState]);

  const commitGridLayout = useCallback(
    (nextLayout: readonly GridLayoutItem[]) => {
      updateLayoutState((current) => {
        const layoutMap = new Map(nextLayout.map((item) => [item.i, item] as const));

        const nextItems = current.enabledWidgets.map((widgetId) => {
          const fallback =
            current.layout.find((item) => item.i === widgetId) ?? getDefaultLayoutItem(widgetId);
          const nextItem = layoutMap.get(widgetId);

          if (!nextItem) {
            return fallback;
          }

          return {
            ...fallback,
            x: nextItem.x,
            y: nextItem.y,
            w: nextItem.w,
            h: nextItem.h,
          };
        });

        return {
          ...current,
          layout: nextItems,
        };
      });
    },
    [updateLayoutState]
  );

  const handleAddWidget = useCallback(
    (widgetId: DashboardWidgetId) => {
      updateLayoutState((current) => {
        if (current.enabledWidgets.includes(widgetId)) {
          return current;
        }

        const nextY = current.layout.reduce(
          (maxY, item) => Math.max(maxY, item.y + item.h),
          0
        );
        const nextItem = {
          ...getDefaultLayoutItem(widgetId),
          y: nextY,
        };

        return {
          ...current,
          enabledWidgets: [...current.enabledWidgets, widgetId],
          layout: [...current.layout, nextItem],
        };
      });
    },
    [updateLayoutState]
  );

  const handleRemoveWidget = useCallback(
    (widgetId: DashboardWidgetId) => {
      updateLayoutState((current) => ({
        ...current,
        enabledWidgets: current.enabledWidgets.filter((item) => item !== widgetId),
        layout: current.layout.filter((item) => item.i !== widgetId),
      }));
    },
    [updateLayoutState]
  );

  const enabledWidgets = layoutState.enabledWidgets;
  const availableWidgets = DASHBOARD_WIDGET_IDS.filter(
    (widgetId) => !enabledWidgets.includes(widgetId)
  );

  const layoutForGrid = useMemo(
    () =>
      toGridLayout(
        enabledWidgets.map(
          (widgetId) =>
            layoutState.layout.find((item) => item.i === widgetId) ??
            getDefaultLayoutItem(widgetId)
        )
      ),
    [enabledWidgets, layoutState.layout]
  );

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

  const layoutStatusLabel =
    layoutStatus === "saving"
      ? t("dashboardLayoutSaving")
      : layoutStatus === "saved"
        ? t("dashboardLayoutSaved")
        : layoutStatus === "error"
          ? t("dashboardLayoutSaveFailed")
          : t("dashboardLayoutSynced");

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
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
            onClick={refreshWidgetsData}
            loading={isRefreshing}
          >
            {t("dashboardRefreshData")}
          </Button>

          <span
            className={`${styles.saveStatus} ${
              layoutStatus === "saving"
                ? styles.saveSaving
                : layoutStatus === "saved"
                  ? styles.saveSaved
                  : layoutStatus === "error"
                    ? styles.saveError
                    : styles.saveIdle
            }`}
          >
            {layoutStatusLabel}
          </span>
        </div>
      </div>

      <div className={styles.addRow}>
        {availableWidgets.length === 0 ? (
          <p className={styles.placeholder}>{t("dashboardNoMoreWidgets")}</p>
        ) : (
          availableWidgets.map((widgetId) => {
            const widget = widgetDefinitions[widgetId];

            return (
              <Button
                key={widgetId}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAddWidget(widgetId)}
              >
                {t("dashboardAddWidget", { widget: widget.title })}
              </Button>
            );
          })
        )}
      </div>

      {!layoutReady ? (
        <Card padding="md" variant="glass">
          <p>{t("dashboardLayoutLoading")}</p>
        </Card>
      ) : enabledWidgets.length === 0 ? (
        <div className={styles.emptyEnabled}>{t("dashboardNoWidgetsEnabled")}</div>
      ) : (
        <div className={styles.gridRoot} ref={gridRootRef}>
          <ReactGridLayout
            layout={layoutForGrid}
            width={gridWidth}
            gridConfig={{
              cols: 12,
              rowHeight: 38,
              margin: [12, 12],
              containerPadding: [0, 0],
              maxRows: Number.POSITIVE_INFINITY,
            }}
            dragConfig={{
              enabled: true,
              handle: `.${styles.dragHandle}`,
            }}
            resizeConfig={{
              enabled: true,
            }}
            onLayoutChange={commitGridLayout}
          >
            {enabledWidgets.map((widgetId) => {
              const widget = widgetDefinitions[widgetId];
              return (
                <div key={widget.id}>
                  <article className={styles.widgetShell}>
                    <header className={styles.widgetHeader}>
                      <div className={styles.dragHandle}>
                        <GripVertical size={14} className={styles.widgetIcon} />
                        <span className={styles.widgetTitle}>
                          <span className={styles.widgetIcon}>{widget.icon}</span>
                          <span className={styles.widgetLabel}>{widget.title}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveWidget(widget.id)}
                        aria-label={t("dashboardRemoveWidget", { widget: widget.title })}
                        title={t("dashboardRemoveWidget", { widget: widget.title })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </header>

                    <div className={styles.widgetBody}>
                      <p className={styles.widgetDescription}>{widget.description}</p>
                      {widget.content}
                    </div>
                  </article>
                </div>
              );
            })}
          </ReactGridLayout>
        </div>
      )}
    </section>
  );
}
