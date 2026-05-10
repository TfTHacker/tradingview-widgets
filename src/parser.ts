import { parse as parseYaml } from "yaml";
import { getWidgetDefinition, type TradingViewWidgetDefinition } from "./widgets";

export interface ParsedTradingViewBlock {
  definition: TradingViewWidgetDefinition;
  settings: Record<string, unknown>;
  height: number;
  width: string;
  showAttribution: boolean;
  lazyLoad: boolean;
}

export interface TradingViewDefaults {
  defaultWidget: string;
  defaultHeight: number;
  defaultLocale: string;
  defaultTimezone: string;
  showAttribution: boolean;
  lazyLoadWidgets: boolean;
}

const RESERVED_KEYS = new Set(["widget", "type", "height", "width", "theme", "showAttribution", "show_attribution", "lazyLoad", "lazy_load"]);

export function parseTradingViewBlock(source: string, defaults: TradingViewDefaults, currentTheme: "light" | "dark"): ParsedTradingViewBlock {
  const raw = parseSource(source);
  const widgetName = raw.widget ?? raw.type ?? defaults.defaultWidget;
  const definition = getWidgetDefinition(widgetName);

  if (!definition) {
    throw new Error(`Unsupported TradingView widget: ${String(widgetName || "")}`);
  }

  const height = normalizeHeight(raw.height, definition.defaultHeight || defaults.defaultHeight);
  const width = normalizeWidth(raw.width);
  const showAttribution = normalizeBoolean(raw.showAttribution ?? raw.show_attribution, defaults.showAttribution);
  const lazyLoad = normalizeBoolean(raw.lazyLoad ?? raw.lazy_load, defaults.lazyLoadWidgets);

  const settings: Record<string, unknown> = {
    ...definition.defaultSettings,
    locale: raw.locale ?? definition.defaultSettings.locale ?? defaults.defaultLocale,
  };

  if (definition.id === "advanced-chart" && raw.timezone == null && defaults.defaultTimezone) {
    settings.timezone = defaults.defaultTimezone;
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!RESERVED_KEYS.has(key)) settings[key] = value;
  }

  applyTheme(settings, raw.theme, currentTheme);
  applyDimensions(settings, width, height);

  return { definition, settings, height, width, showAttribution, lazyLoad };
}

function parseSource(source: string): Record<string, unknown> {
  const trimmed = source.trim();
  if (!trimmed) return {};

  try {
    const parsed = parseYaml(trimmed);
    if (parsed == null) return {};
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("TradingView block must contain a YAML/JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse TradingView block: ${message}`);
  }
}

function normalizeHeight(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/px$/, "")) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(80, Math.min(2000, Math.round(numeric)));
}

function normalizeWidth(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.max(120, Math.round(value))}px`;
  if (typeof value !== "string" || !value.trim()) return "100%";
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return `${trimmed}px`;
  if (/^\d+(\.\d+)?(px|%|vw|rem|em)$/.test(trimmed)) return trimmed;
  return "100%";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (["true", "yes", "1", "on"].includes(lower)) return true;
    if (["false", "no", "0", "off"].includes(lower)) return false;
  }
  return fallback;
}

function applyTheme(settings: Record<string, unknown>, themeValue: unknown, currentTheme: "light" | "dark"): void {
  const requested = typeof themeValue === "string" ? themeValue.toLowerCase().trim() : "auto";
  const theme = requested === "dark" || requested === "light" ? requested : currentTheme;

  if ("theme" in settings) settings.theme = theme;
  if ("colorTheme" in settings) settings.colorTheme = theme;
}

function applyDimensions(settings: Record<string, unknown>, width: string, _height: number): void {
  // Let TradingView size itself from the wrapper whenever the widget supports
  // autosize. Several embed scripts validate their config strictly and log
  // "Invalid settings" when width/height are provided in the wrong shape.
  if (settings.autosize === true) {
    if ("width" in settings) settings.width = "100%";
    if ("height" in settings) settings.height = "100%";
    return;
  }

  if ("width" in settings) settings.width = width;
  if ("height" in settings) settings.height = "100%";
}
