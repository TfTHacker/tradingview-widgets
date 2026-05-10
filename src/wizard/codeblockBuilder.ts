import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { TradingViewPluginSettings } from "../settings";
import type { TradingViewWidgetDefinition } from "../widgets";
import { isSimpleOptionValue } from "./optionMetadata";
import { getExtraOptionKeys, type WizardState } from "./state";
import { parseSymbolsText } from "./symbols";

export function buildTradingViewCodeBlock(state: WizardState, definition: TradingViewWidgetDefinition, settings: TradingViewPluginSettings): string {
  const data: Record<string, unknown> = {
    widget: definition.id,
    theme: state.theme,
    height: numericOrString(state.height),
  };

  if (state.width && state.width !== "100%") data.width = numericOrString(state.width);
  if (state.locale) data.locale = state.locale;
  if (state.showAttribution !== settings.showAttribution) data.showAttribution = state.showAttribution;
  if (state.lazyLoad !== settings.lazyLoadWidgets) data.lazyLoad = state.lazyLoad;
  if (hasSetting(definition, "symbol") && state.symbol) data.symbol = state.symbol;
  if (hasSetting(definition, "symbols")) data.symbols = parseSymbolsText(state.symbolsText, definition.id);
  if (hasSetting(definition, "interval") && state.interval) data.interval = state.interval;
  if (hasSetting(definition, "timezone") && state.timezone) data.timezone = state.timezone;

  Object.assign(data, getChangedExtraOptions(state, definition));
  Object.assign(data, parseAdvancedYaml(state.advancedYaml));

  const yaml = stringifyYaml(data).trimEnd();
  return `\`\`\`tradingview\n${yaml}\n\`\`\``;
}

export function hasAdvancedYamlError(advancedYaml: string): boolean {
  if (!advancedYaml.trim()) return false;
  try {
    parseYaml(advancedYaml);
    return false;
  } catch {
    return true;
  }
}

export function hasSetting(definition: TradingViewWidgetDefinition, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(definition.defaultSettings, key);
}

function getChangedExtraOptions(state: WizardState, definition: TradingViewWidgetDefinition): Record<string, unknown> {
  const changed: Record<string, unknown> = {};
  for (const key of getExtraOptionKeys(definition)) {
    const defaultValue = definition.defaultSettings[key];
    const value = isSimpleOptionValue(defaultValue) ? state.extraOptions[key] : parseYamlValue(state.extraOptionText[key]);
    if (!isSameValue(value, defaultValue)) changed[key] = value;
  }
  return changed;
}

function parseAdvancedYaml(advancedYaml: string): Record<string, unknown> {
  const trimmed = advancedYaml.trim();
  if (!trimmed) return {};
  try {
    const parsed = parseYaml(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

function parseYamlValue(value: string | undefined): unknown {
  if (value == null || !value.trim()) return null;
  try {
    return parseYaml(value);
  } catch {
    return value;
  }
}

function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function numericOrString(value: string): string | number {
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && trimmed !== "" ? numeric : trimmed;
}
