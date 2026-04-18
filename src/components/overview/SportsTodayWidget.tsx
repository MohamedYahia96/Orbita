"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Loader2, RefreshCw, Trophy } from "lucide-react";
import { Card, Button } from "@/components/ui";

type SportsMatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELED"
  | "UNKNOWN";

type SportsMatch = {
  id: string;
  competition: string;
  competitionCountry: string | null;
  kickoffAt: string;
  status: SportsMatchStatus;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

type SportsTodayResponse = {
  date: string;
  source: string;
  matches: SportsMatch[];
  warning?: string;
};

function statusKey(status: SportsMatchStatus) {
  switch (status) {
    case "LIVE":
      return "sportsStatusLive";
    case "SCHEDULED":
      return "sportsStatusScheduled";
    case "FINISHED":
      return "sportsStatusFinished";
    case "POSTPONED":
      return "sportsStatusPostponed";
    case "CANCELED":
      return "sportsStatusCanceled";
    default:
      return "sportsStatusUnknown";
  }
}

export function SportsTodayWidget() {
  const t = useTranslations("Overview");
  const locale = useLocale();

  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sports/today?limit=8", {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as SportsTodayResponse | null;

      if (!res.ok || !data) {
        throw new Error("failed_to_load_matches");
      }

      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setSource(typeof data.source === "string" ? data.source : null);
      setWarning(typeof data.warning === "string" ? data.warning : null);
    } catch {
      setMatches([]);
      setSource(null);
      setWarning(null);
      setError(t("sportsLoadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

  const renderKickoff = (kickoffAt: string) => {
    const date = new Date(kickoffAt);
    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }

    return timeFormatter.format(date);
  };

  return (
    <Card
      padding="md"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      className="border border-(--color-border)"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Trophy size={16} className="text-accent" />
          {t("sportsTodayTitle")}
        </h3>
        <button
          type="button"
          onClick={loadMatches}
          className="bg-transparent border-none p-1 rounded cursor-pointer opacity-70 hover:opacity-100"
          aria-label={t("sportsRefresh")}
          title={t("sportsRefresh")}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {source ? (
        <p className="text-xs opacity-60">{t("sportsDataSource", { source })}</p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-3 flex flex-col gap-3">
          <p className="text-sm text-(--color-error) flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </p>
          <Button type="button" variant="secondary" onClick={loadMatches}>
            {t("sportsRetry")}
          </Button>
        </div>
      ) : matches.length === 0 ? (
        <p className="text-sm opacity-70">{t("sportsNoMatches")}</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-auto pr-1">
          {matches.map((match) => {
            const hasScore = match.homeScore !== null && match.awayScore !== null;
            const scoreLabel = hasScore
              ? `${match.homeScore} - ${match.awayScore}`
              : t("sportsVs");

            return (
              <div
                key={match.id}
                className="rounded-lg border border-(--color-border) bg-(--color-bg-tertiary) p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs opacity-70 truncate">{match.competition}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {t(statusKey(match.status))}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <span className="truncate">{match.homeTeam}</span>
                  <span className="font-semibold px-2">{scoreLabel}</span>
                  <span className="truncate text-right">{match.awayTeam}</span>
                </div>

                <p className="text-xs opacity-60 mt-2">{renderKickoff(match.kickoffAt)}</p>
              </div>
            );
          })}
        </div>
      )}

      {warning ? <p className="text-xs opacity-60">{warning}</p> : null}
    </Card>
  );
}
