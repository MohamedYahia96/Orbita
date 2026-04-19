"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, EmptyState } from "@/components/ui";

type AnalyticsResponse = {
  periodDays: number;
  summary: {
    totalFeeds: number;
    totalWorkspaces: number;
    totalItems: number;
    unreadItems: number;
    savedItems: number;
    bookmarkedItems: number;
    totalRecent: number;
    readRatio: number;
    peakHour: {
      hour: number;
      count: number;
    };
  };
  topFeeds: Array<{
    id: string;
    title: string;
    platform: string | null;
    count: number;
  }>;
  activityByHour: Array<{
    hour: number;
    count: number;
  }>;
};

export default function AnalyticsPage() {
  const t = useTranslations("Analytics");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics?days=7", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as AnalyticsResponse | null;
      if (res.ok && payload) {
        setData(payload);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const maxTopFeedCount = useMemo(() => {
    if (!data || data.topFeeds.length === 0) return 1;
    return Math.max(...data.topFeeds.map((feed) => feed.count), 1);
  }, [data]);

  const maxHourCount = useMemo(() => {
    if (!data || data.activityByHour.length === 0) return 1;
    return Math.max(...data.activityByHour.map((bucket) => bucket.count), 1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={<BarChart3 size={40} />}
        title={t("title")}
        description={t("empty")}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-sm text-secondary">{t("subtitle", { days: data.periodDays })}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
        <Card padding="md" variant="glass" title={t("totalFeeds")}>
          <p className="text-3xl font-bold">{data.summary.totalFeeds}</p>
        </Card>
        <Card padding="md" variant="glass" title={t("totalItems")}>
          <p className="text-3xl font-bold">{data.summary.totalItems}</p>
        </Card>
        <Card padding="md" variant="glass" title={t("readRatio")}>
          <p className="text-3xl font-bold">{data.summary.readRatio}%</p>
        </Card>
        <Card padding="md" variant="glass" title={t("peakHour")}>
          <p className="text-lg font-semibold">{String(data.summary.peakHour.hour).padStart(2, "0")}:00</p>
          <p className="text-xs text-secondary mt-1">{t("eventsCount", { count: data.summary.peakHour.count })}</p>
        </Card>
      </div>

      <Card padding="md" title={t("topFeeds")}> 
        {data.topFeeds.length === 0 ? (
          <p className="text-sm text-secondary">{t("noTopFeeds")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {data.topFeeds.map((feed) => (
              <div key={feed.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "0.25rem" }}>
                  <span className="text-sm font-medium">{feed.title}</span>
                  <span className="text-xs text-secondary">{feed.count}</span>
                </div>
                <div className="rounded-full bg-(--color-bg-hover)" style={{ height: "8px" }}>
                  <div
                    className="rounded-full bg-(--color-accent)"
                    style={{
                      height: "8px",
                      width: `${Math.max((feed.count / maxTopFeedCount) * 100, 5)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md" title={t("activityByHour")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "0.35rem" }}>
          {data.activityByHour.map((bucket) => (
            <div key={bucket.hour} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "center" }}>
              <div
                className="rounded-sm bg-(--color-accent)"
                style={{
                  width: "100%",
                  minHeight: "6px",
                  height: `${Math.max((bucket.count / maxHourCount) * 70, 6)}px`,
                }}
              />
              <span className="text-[10px] text-secondary">{bucket.hour}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
