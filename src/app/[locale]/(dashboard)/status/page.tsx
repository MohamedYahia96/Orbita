"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card, EmptyState } from "@/components/ui";

type StatusResponse = {
  generatedAt: string;
  summary: {
    totalFeeds: number;
    activeFeeds: number;
    errorFeeds: number;
    pausedFeeds: number;
    lastCheckedAt: string | null;
  };
  integrations: {
    gmail: { connected: boolean; email: string | null };
    drive: { connected: boolean; email: string | null };
    push: { configured: boolean; subscriptions: number };
    sports: { healthy: boolean; source: string | null; warning: string | null };
  };
  feeds: Array<{
    id: string;
    title: string;
    type: string;
    platform: string | null;
    status: string;
    lastChecked: string | null;
    workspaceName: string | null;
  }>;
};

export default function StatusPage() {
  const t = useTranslations("Status");

  const [data, setData] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as StatusResponse | { error?: string } | null;
      if (!res.ok || !payload || !("summary" in payload)) {
        throw new Error((payload && "error" in payload && payload.error) || t("loadFailed"));
      }

      setData(payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const retrySync = async () => {
    setIsRetrying(true);
    setError(null);

    try {
      const res = await fetch("/api/feeds/sync", {
        method: "POST",
      });

      const payload = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || t("retryFailed"));
      }

      await loadStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("retryFailed"));
    } finally {
      setIsRetrying(false);
    }
  };

  const integrationRows = useMemo(() => {
    if (!data) return [];

    return [
      {
        id: "gmail",
        name: t("gmail"),
        healthy: data.integrations.gmail.connected,
        details: data.integrations.gmail.email || t("notConnected"),
      },
      {
        id: "drive",
        name: t("drive"),
        healthy: data.integrations.drive.connected,
        details: data.integrations.drive.email || t("notConnected"),
      },
      {
        id: "push",
        name: t("push"),
        healthy: data.integrations.push.configured,
        details: t("pushSubscriptions", { count: data.integrations.push.subscriptions }),
      },
      {
        id: "sports",
        name: t("sports"),
        healthy: data.integrations.sports.healthy,
        details: data.integrations.sports.warning || data.integrations.sports.source || t("healthy"),
      },
    ];
  }, [data, t]);

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
        icon={<AlertTriangle size={40} />}
        title={t("title")}
        description={error || t("loadFailed")}
        action={
          <Button variant="secondary" onClick={() => void loadStatus()}>
            {t("reload")}
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-secondary text-sm">{t("subtitle")}</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw size={14} className={isRetrying ? "animate-spin" : ""} />}
          onClick={retrySync}
          loading={isRetrying}
        >
          {t("retry")}
        </Button>
      </div>

      {error ? (
        <Card padding="md">
          <p className="text-sm text-secondary">{error}</p>
        </Card>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
        <Card padding="md" variant="glass" title={t("totalFeeds")}>
          <p className="text-3xl font-bold">{data.summary.totalFeeds}</p>
        </Card>
        <Card padding="md" variant="glass" title={t("activeFeeds")}>
          <p className="text-3xl font-bold text-success">{data.summary.activeFeeds}</p>
        </Card>
        <Card padding="md" variant="glass" title={t("errorFeeds")}>
          <p className="text-3xl font-bold text-danger">{data.summary.errorFeeds}</p>
        </Card>
        <Card padding="md" variant="glass" title={t("lastChecked")}> 
          <p className="text-sm">{data.summary.lastCheckedAt ? new Date(data.summary.lastCheckedAt).toLocaleString() : "--"}</p>
        </Card>
      </div>

      <Card padding="md" title={t("integrations")}> 
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
          {integrationRows.map((integration) => (
            <div key={integration.id} className="rounded-lg border border-(--color-border) p-3">
              <p className="text-sm font-medium flex items-center gap-2">
                {integration.healthy ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : (
                  <AlertTriangle size={14} className="text-danger" />
                )}
                {integration.name}
              </p>
              <p className="text-xs text-secondary mt-1">{integration.details}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md" title={t("feeds")}>
        {data.feeds.length === 0 ? (
          <p className="text-sm text-secondary">{t("noFeeds")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {data.feeds.map((feed) => (
              <div key={feed.id} className="rounded-md border border-(--color-border) p-3">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <p className="font-medium">{feed.title}</p>
                  <span className="text-xs text-secondary">{feed.status}</span>
                </div>
                <p className="text-xs text-secondary mt-1">
                  {feed.workspaceName || t("unassigned")} • {feed.type}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {t("lastCheckedItem", {
                    value: feed.lastChecked ? new Date(feed.lastChecked).toLocaleString() : "--",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
