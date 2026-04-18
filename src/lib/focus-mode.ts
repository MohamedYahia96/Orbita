export type FocusModeSchedule = {
  enabled: boolean;
  days: number[];
  startHour: number;
  endHour: number;
  timezoneOffsetMinutes: number;
};

export type FocusModeSettings = {
  enabled: boolean;
  workspaceId: string | null;
  muteOutsideWorkspace: boolean;
  until: string | null;
  schedule: FocusModeSchedule;
};

export type FocusModeState = {
  settings: FocusModeSettings;
  isActive: boolean;
  timerExpired: boolean;
  scheduleMatched: boolean;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [...ALL_DAYS];
  }

  const unique: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item > 6) {
      continue;
    }

    if (!unique.includes(item)) {
      unique.push(item);
    }
  }

  return unique.length > 0 ? unique.sort((a, b) => a - b) : [...ALL_DAYS];
}

function sanitizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function sanitizeSchedule(value: unknown): FocusModeSchedule {
  const record = isRecord(value) ? value : {};

  return {
    enabled: Boolean(record.enabled),
    days: sanitizeDays(record.days),
    startHour: clamp(Math.trunc(asFiniteNumber(record.startHour, 9)), 0, 23),
    endHour: clamp(Math.trunc(asFiniteNumber(record.endHour, 17)), 0, 23),
    timezoneOffsetMinutes: clamp(
      Math.trunc(asFiniteNumber(record.timezoneOffsetMinutes, 0)),
      -840,
      840
    ),
  };
}

export function createDefaultFocusModeSettings(): FocusModeSettings {
  return {
    enabled: false,
    workspaceId: null,
    muteOutsideWorkspace: true,
    until: null,
    schedule: {
      enabled: false,
      days: [...ALL_DAYS],
      startHour: 9,
      endHour: 17,
      timezoneOffsetMinutes: 0,
    },
  };
}

export function sanitizeFocusModeSettings(
  input: unknown,
  allowedWorkspaceIds?: Set<string>
): FocusModeSettings {
  const record = isRecord(input) ? input : {};
  const workspaceId = typeof record.workspaceId === "string" && record.workspaceId.trim()
    ? record.workspaceId.trim()
    : null;

  const validWorkspaceId = workspaceId && (!allowedWorkspaceIds || allowedWorkspaceIds.has(workspaceId))
    ? workspaceId
    : null;

  return {
    enabled: Boolean(record.enabled),
    workspaceId: validWorkspaceId,
    muteOutsideWorkspace: record.muteOutsideWorkspace !== false,
    until: sanitizeIsoDate(record.until),
    schedule: sanitizeSchedule(record.schedule),
  };
}

export function mergeFocusModeSettings(
  current: FocusModeSettings,
  patch: unknown,
  allowedWorkspaceIds?: Set<string>
): FocusModeSettings {
  if (!isRecord(patch)) {
    return sanitizeFocusModeSettings(current, allowedWorkspaceIds);
  }

  const nextRaw: Record<string, unknown> = {
    ...current,
    ...patch,
    schedule: {
      ...current.schedule,
      ...(isRecord(patch.schedule) ? patch.schedule : {}),
    },
  };

  return sanitizeFocusModeSettings(nextRaw, allowedWorkspaceIds);
}

function isScheduleHourActive(schedule: FocusModeSchedule, hour: number) {
  const start = schedule.startHour;
  const end = schedule.endHour;

  if (start === end) {
    return true;
  }

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
}

export function isScheduleActive(schedule: FocusModeSchedule, now = new Date()) {
  if (!schedule.enabled) {
    return true;
  }

  const shifted = new Date(now.getTime() - schedule.timezoneOffsetMinutes * 60_000);
  const day = shifted.getUTCDay();
  const hour = shifted.getUTCHours();

  if (!schedule.days.includes(day)) {
    return false;
  }

  return isScheduleHourActive(schedule, hour);
}

export function resolveFocusModeState(settings: FocusModeSettings, now = new Date()): FocusModeState {
  const hasWorkspace = typeof settings.workspaceId === "string" && settings.workspaceId.length > 0;
  const timerExpiresAt = settings.until ? new Date(settings.until).getTime() : null;
  const timerExpired = timerExpiresAt !== null && timerExpiresAt <= now.getTime();
  const scheduleMatched = isScheduleActive(settings.schedule, now);

  const isActive =
    settings.enabled &&
    hasWorkspace &&
    !timerExpired &&
    scheduleMatched;

  return {
    settings,
    isActive,
    timerExpired,
    scheduleMatched,
  };
}
