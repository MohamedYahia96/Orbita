export const DASHBOARD_WIDGET_IDS = [
  "activity",
  "notifications",
  "sports",
  "email",
  "git",
  "digest",
  "saved",
  "quickLinks",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardLayoutItem = {
  i: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
};

export type DashboardLayoutState = {
  version: 1;
  enabledWidgets: DashboardWidgetId[];
  layout: DashboardLayoutItem[];
};

const GRID_COLUMNS = 12;

const DEFAULT_LAYOUT_ITEMS: DashboardLayoutItem[] = [
  { i: "activity", x: 0, y: 0, w: 8, h: 7, minW: 4, minH: 4 },
  { i: "notifications", x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "sports", x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
  { i: "email", x: 0, y: 7, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "git", x: 4, y: 7, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "digest", x: 8, y: 8, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "saved", x: 0, y: 10, w: 6, h: 3, minW: 3, minH: 2 },
  { i: "quickLinks", x: 6, y: 10, w: 6, h: 3, minW: 3, minH: 2 },
];

const DEFAULT_LAYOUT_MAP = new Map(
  DEFAULT_LAYOUT_ITEMS.map((item) => [item.i, item] as const)
);

const DASHBOARD_WIDGET_ID_SET = new Set<DashboardWidgetId>(DASHBOARD_WIDGET_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.trunc(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLayoutItem(input: unknown): DashboardLayoutItem | null {
  if (!isRecord(input) || !isDashboardWidgetId(input.i)) {
    return null;
  }

  const fallback = getDefaultLayoutItem(input.i);
  const width = clamp(toInteger(input.w, fallback.w), 1, GRID_COLUMNS);
  const height = clamp(toInteger(input.h, fallback.h), 1, 20);
  const maxX = Math.max(0, GRID_COLUMNS - width);
  const x = clamp(toInteger(input.x, fallback.x), 0, maxX);
  const y = Math.max(0, toInteger(input.y, fallback.y));
  const minW = clamp(toInteger(input.minW, fallback.minW ?? 1), 1, GRID_COLUMNS);
  const minH = clamp(toInteger(input.minH, fallback.minH ?? 1), 1, 20);

  return {
    i: input.i,
    x,
    y,
    w: width,
    h: height,
    minW,
    minH,
  };
}

function sanitizeEnabledWidgets(input: unknown): DashboardWidgetId[] {
  if (!Array.isArray(input)) {
    return [...DASHBOARD_WIDGET_IDS];
  }

  const unique: DashboardWidgetId[] = [];
  for (const value of input) {
    if (!isDashboardWidgetId(value) || unique.includes(value)) {
      continue;
    }

    unique.push(value);
  }

  return unique;
}

export function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && DASHBOARD_WIDGET_ID_SET.has(value as DashboardWidgetId);
}

export function getDefaultLayoutItem(widgetId: DashboardWidgetId): DashboardLayoutItem {
  const fallback = DEFAULT_LAYOUT_MAP.get(widgetId);
  if (!fallback) {
    return {
      i: widgetId,
      x: 0,
      y: 0,
      w: 4,
      h: 3,
      minW: 3,
      minH: 2,
    };
  }

  return {
    ...fallback,
  };
}

export function createDefaultDashboardLayout(): DashboardLayoutState {
  return {
    version: 1,
    enabledWidgets: [...DASHBOARD_WIDGET_IDS],
    layout: DEFAULT_LAYOUT_ITEMS.map((item) => ({ ...item })),
  };
}

export function sanitizeDashboardLayout(input: unknown): DashboardLayoutState {
  const defaultState = createDefaultDashboardLayout();
  if (!isRecord(input)) {
    return defaultState;
  }

  const enabledWidgets = sanitizeEnabledWidgets(input.enabledWidgets);
  const layoutCandidates = Array.isArray(input.layout) ? input.layout : [];
  const layoutMap = new Map<DashboardWidgetId, DashboardLayoutItem>();

  for (const candidate of layoutCandidates) {
    const normalizedItem = normalizeLayoutItem(candidate);
    if (!normalizedItem || !enabledWidgets.includes(normalizedItem.i) || layoutMap.has(normalizedItem.i)) {
      continue;
    }

    layoutMap.set(normalizedItem.i, normalizedItem);
  }

  for (const widgetId of enabledWidgets) {
    if (!layoutMap.has(widgetId)) {
      layoutMap.set(widgetId, getDefaultLayoutItem(widgetId));
    }
  }

  return {
    version: 1,
    enabledWidgets,
    layout: enabledWidgets.map((widgetId) => {
      const item = layoutMap.get(widgetId);
      return item ? { ...item } : getDefaultLayoutItem(widgetId);
    }),
  };
}