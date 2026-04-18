"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, Tooltip } from "@/components/ui";
import {
  createDefaultFocusModeSettings,
  type FocusModeSettings,
} from "@/lib/focus-mode";
import styles from "./FocusModeControl.module.css";

type Workspace = {
  id: string;
  name: string;
};

type FocusModeResponse = {
  settings: FocusModeSettings;
  isActive: boolean;
  activeWorkspaceName: string | null;
  timerExpired: boolean;
  scheduleMatched: boolean;
};

const WEEK_DAYS = [
  { id: 0, key: "daySun" },
  { id: 1, key: "dayMon" },
  { id: 2, key: "dayTue" },
  { id: 3, key: "dayWed" },
  { id: 4, key: "dayThu" },
  { id: 5, key: "dayFri" },
  { id: 6, key: "daySat" },
] as const;

const PRESET_TIMER_MINUTES = [0, 25, 45, 60, 90, 120];

function deriveTimerMinutes(until: string | null) {
  if (!until) {
    return 0;
  }

  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) {
    return 0;
  }

  return Math.ceil(ms / 60_000);
}

function toSafeInt(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.max(min, Math.min(max, parsed));
}

export function FocusModeControl() {
  const t = useTranslations("FocusMode");

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [settings, setSettings] = useState<FocusModeSettings>(createDefaultFocusModeSettings());
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch("/api/users/focus-mode", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as FocusModeResponse | null;
      if (!res.ok || !data?.settings) {
        return;
      }

      setSettings(data.settings);
      setIsActive(Boolean(data.isActive));
      setActiveWorkspaceName(data.activeWorkspaceName || null);
      setTimerMinutes(deriveTimerMinutes(data.settings.until));
    } catch {
      // no-op for background refresh
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [focusRes, workspacesRes] = await Promise.all([
        fetch("/api/users/focus-mode", { cache: "no-store" }),
        fetch("/api/workspaces", { cache: "no-store" }),
      ]);

      const focusData = (await focusRes.json().catch(() => null)) as FocusModeResponse | null;
      const workspacesData = (await workspacesRes.json().catch(() => null)) as Workspace[] | null;

      if (!focusRes.ok || !focusData?.settings) {
        throw new Error(t("loadFailed"));
      }

      setSettings(focusData.settings);
      setIsActive(Boolean(focusData.isActive));
      setActiveWorkspaceName(focusData.activeWorkspaceName || null);
      setTimerMinutes(deriveTimerMinutes(focusData.settings.until));
      setWorkspaces(Array.isArray(workspacesData) ? workspacesData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshState();
    const interval = window.setInterval(() => {
      void refreshState();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshState]);

  const handleOpen = async () => {
    setIsOpen(true);
    await loadData();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    if (settings.enabled && !settings.workspaceId) {
      setError(t("workspaceRequired"));
      setIsSaving(false);
      return;
    }

    const safeTimerMinutes = Math.max(0, Math.min(720, Math.trunc(timerMinutes || 0)));
    const until =
      settings.enabled && safeTimerMinutes > 0
        ? new Date(Date.now() + safeTimerMinutes * 60_000).toISOString()
        : null;

    const payload: FocusModeSettings = {
      ...settings,
      until,
      schedule: {
        ...settings.schedule,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      },
    };

    try {
      const res = await fetch("/api/users/focus-mode", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as FocusModeResponse | { error?: string } | null;

      if (!res.ok || !data || !("settings" in data)) {
        throw new Error((data && "error" in data && data.error) || t("saveFailed"));
      }

      setSettings(data.settings);
      setTimerMinutes(deriveTimerMinutes(data.settings.until));
      setIsActive(Boolean(data.isActive));
      setActiveWorkspaceName(data.activeWorkspaceName || null);
      setIsOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const dayLabelMap = useMemo(
    () =>
      WEEK_DAYS.map((day) => ({
        id: day.id,
        label: t(day.key),
      })),
    [t]
  );

  const toggleDay = (day: number) => {
    setSettings((current) => {
      const hasDay = current.schedule.days.includes(day);
      const days = hasDay
        ? current.schedule.days.filter((item) => item !== day)
        : [...current.schedule.days, day].sort((a, b) => a - b);

      return {
        ...current,
        schedule: {
          ...current.schedule,
          days,
        },
      };
    });
  };

  const statusText = isActive
    ? activeWorkspaceName
      ? t("statusActiveWithWorkspace", { workspace: activeWorkspaceName })
      : t("statusActive")
    : t("statusInactive");

  return (
    <>
      <Tooltip content={statusText}>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          icon={<Crosshair size={18} />}
          onClick={handleOpen}
          aria-label={t("open")}
          title={t("open")}
        />
      </Tooltip>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("title")}
        description={t("description")}
      >
        <div className={styles.form}>
          <div className={styles.header}>
            <span
              className={`${styles.statusPill} ${
                isActive ? styles.statusActive : styles.statusInactive
              }`}
            >
              {statusText}
            </span>

            <Button
              type="button"
              size="sm"
              variant={settings.enabled ? "secondary" : "ghost"}
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  enabled: !current.enabled,
                }))
              }
            >
              {settings.enabled ? t("disable") : t("enable")}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : (
            <>
              <div className={styles.block}>
                <label className={styles.label} htmlFor="focus-workspace-select">
                  {t("workspaceLabel")}
                </label>
                <select
                  id="focus-workspace-select"
                  className={styles.select}
                  value={settings.workspaceId || ""}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      workspaceId: e.target.value || null,
                    }))
                  }
                >
                  <option value="">{t("workspacePlaceholder")}</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
                <p className={styles.hint}>{t("workspaceHint")}</p>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={settings.muteOutsideWorkspace}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      muteOutsideWorkspace: e.target.checked,
                    }))
                  }
                />
                <span>{t("muteOutside")}</span>
              </label>

              <div className={styles.block}>
                <label className={styles.label} htmlFor="focus-timer-select">
                  {t("timerLabel")}
                </label>
                <select
                  id="focus-timer-select"
                  className={styles.select}
                  value={PRESET_TIMER_MINUTES.includes(timerMinutes) ? timerMinutes : -1}
                  onChange={(e) => {
                    const selected = Number.parseInt(e.target.value, 10);

                    if (selected === -1) {
                      if (timerMinutes === 0) {
                        setTimerMinutes(30);
                      }
                      return;
                    }

                    setTimerMinutes(Math.max(0, Math.min(720, selected)));
                  }}
                >
                  {PRESET_TIMER_MINUTES.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes === 0 ? t("timerNone") : t("timerMinutes", { count: minutes })}
                    </option>
                  ))}
                  <option value={-1}>{t("timerCustom")}</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  max={720}
                  inputSize="sm"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(toSafeInt(e.target.value, 0, 720))}
                />
                <p className={styles.hint}>{t("timerHint")}</p>
              </div>

              <div className={styles.block}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={settings.schedule.enabled}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        schedule: {
                          ...current.schedule,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>{t("scheduleEnabled")}</span>
                </label>

                {settings.schedule.enabled ? (
                  <>
                    <div className={styles.days}>
                      {dayLabelMap.map((day) => {
                        const isSelected = settings.schedule.days.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            className={`${styles.dayBtn} ${isSelected ? styles.dayActive : ""}`}
                            onClick={() => toggleDay(day.id)}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className={styles.row}>
                      <div className={styles.block}>
                        <label className={styles.label} htmlFor="focus-schedule-start">
                          {t("scheduleStart")}
                        </label>
                        <select
                          id="focus-schedule-start"
                          className={styles.select}
                          value={settings.schedule.startHour}
                          onChange={(e) =>
                            setSettings((current) => ({
                              ...current,
                              schedule: {
                                ...current.schedule,
                                startHour: toSafeInt(e.target.value, 0, 23),
                              },
                            }))
                          }
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <option key={hour} value={hour}>
                              {`${hour.toString().padStart(2, "0")}:00`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.block}>
                        <label className={styles.label} htmlFor="focus-schedule-end">
                          {t("scheduleEnd")}
                        </label>
                        <select
                          id="focus-schedule-end"
                          className={styles.select}
                          value={settings.schedule.endHour}
                          onChange={(e) =>
                            setSettings((current) => ({
                              ...current,
                              schedule: {
                                ...current.schedule,
                                endHour: toSafeInt(e.target.value, 0, 23),
                              },
                            }))
                          }
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <option key={hour} value={hour}>
                              {`${hour.toString().padStart(2, "0")}:00`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className={styles.hint}>{t("scheduleHint")}</p>
                  </>
                ) : null}
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}

              <div className={styles.footer}>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="button" onClick={handleSave} loading={isSaving}>
                  {t("save")}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
