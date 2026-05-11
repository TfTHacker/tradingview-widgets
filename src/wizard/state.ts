import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { TradingViewPluginSettings } from "../settings";
import { getWidgetDefinition, WIDGETS, type TradingViewWidgetDefinition } from "../widgets";
import { isSimpleOptionValue, BASIC_SETTING_KEYS } from "./optionMetadata";
import { formatDefaultSymbolsText } from "./symbols";

export interface WizardState {
  widget: string;
  symbol: string;
  symbolsText: string;
  interval: string;
  theme: string;
  height: string;
  width: string;
  locale: string;
  timezone: string;
  showAttribution: boolean;
  lazyLoad: boolean;
  extraOptions: Record<string, unknown>;
  extraOptionText: Record<string, string>;
  advancedYaml: string;
}

export function createInitialWizardState(definition: TradingViewWidgetDefinition, settings: TradingViewPluginSettings): WizardState {
  const widgetSettings = definition.defaultSettings;
  const extraOptions: Record<string, unknown> = {};
  const extraOptionText: Record<string, string> = {};

  for (const key of getExtraOptionKeys(definition)) {
    const value = widgetSettings[key];
    if (isSimpleOptionValue(value)) extraOptions[key] = value;
    else extraOptionText[key] = stringifyYaml(value).trimEnd();
  }

  return {
    widget: definition.id,
    symbol: typeof widgetSettings.symbol === "string" ? widgetSettings.symbol : "NASDAQ:AAPL",
    symbolsText: formatDefaultSymbolsText(widgetSettings.symbols),
    interval: typeof widgetSettings.interval === "string" ? widgetSettings.interval : "D",
    theme: "auto",
    height: String(definition.defaultHeight || settings.defaultHeight),
    width: "100%",
    locale: typeof widgetSettings.locale === "string" ? widgetSettings.locale : settings.defaultLocale,
    timezone: typeof widgetSettings.timezone === "string" ? widgetSettings.timezone : settings.defaultTimezone,
    showAttribution: settings.showAttribution,
    lazyLoad: settings.lazyLoadWidgets,
    extraOptions,
    extraOptionText,
    advancedYaml: "",
  };
}

export function createWizardStateFromSource(source: string, settings: TradingViewPluginSettings): WizardState {
  const raw = parseSource(source);
  const definition = getWidgetDefinition(raw.widget ?? raw.type) ?? getWidgetDefinition(settings.defaultWidget) ?? WIDGETS[0];
  const state = createInitialWizardState(definition, settings);
  const advanced: Record<string, unknown> = {};

  state.widget = definition.id;

  for (const [key, value] of Object.entries(raw)) {
    if (key === "widget" || key === "type") continue;
    if (key === "symbol" && typeof value === "string") state.symbol = value;
    else if (key === "symbols") state.symbolsText = formatDefaultSymbolsText(value);
    else if (key === "interval" && typeof value === "string") state.interval = value;
    else if (key === "theme" && typeof value === "string") state.theme = value;
    else if (key === "height") state.height = String(value ?? "");
    else if (key === "width") state.width = String(value ?? "");
    else if (key === "locale" && typeof value === "string") state.locale = value;
    else if (key === "timezone" && typeof value === "string") state.timezone = value;
    else if (key === "showAttribution" || key === "show_attribution") state.showAttribution = normalizeBoolean(value, state.showAttribution);
    else if (key === "lazyLoad" || key === "lazy_load") state.lazyLoad = normalizeBoolean(value, state.lazyLoad);
    else if (Object.prototype.hasOwnProperty.call(definition.defaultSettings, key)) {
      const defaultValue = definition.defaultSettings[key];
      if (isSimpleOptionValue(defaultValue)) state.extraOptions[key] = value;
      else state.extraOptionText[key] = stringifyYaml(value).trimEnd();
    } else {
      advanced[key] = value;
    }
  }

  state.advancedYaml = Object.keys(advanced).length ? stringifyYaml(advanced).trimEnd() : "";
  return state;
}

export function getExtraOptionKeys(definition: TradingViewWidgetDefinition): string[] {
  return Object.keys(definition.defaultSettings).filter((key) => !BASIC_SETTING_KEYS.has(key));
}

function parseSource(source: string): Record<string, unknown> {
  const trimmed = source.trim();
  if (!trimmed) return {};
  const parsed = parseYaml(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["true", "yes", "1", "on"].includes(normalized)) return true;
    if (["false", "no", "0", "off"].includes(normalized)) return false;
  }
  return fallback;
}
