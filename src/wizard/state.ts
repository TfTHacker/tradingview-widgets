import { stringify as stringifyYaml } from "yaml";
import type { TradingViewPluginSettings } from "../settings";
import type { TradingViewWidgetDefinition } from "../widgets";
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

export function getExtraOptionKeys(definition: TradingViewWidgetDefinition): string[] {
  return Object.keys(definition.defaultSettings).filter((key) => !BASIC_SETTING_KEYS.has(key));
}
