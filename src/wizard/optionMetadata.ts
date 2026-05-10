export type WizardOptionSection = "appearance" | "behavior" | "advanced";

export const INTERVALS = ["1", "5", "15", "30", "60", "240", "D", "W", "M"];
export const THEMES = ["auto", "light", "dark"];

export const BASIC_SETTING_KEYS = new Set(["symbol", "symbols", "interval", "locale", "timezone", "theme", "colorTheme", "width", "height"]);

export const OPTION_CHOICES: Record<string, string[]> = {
  blockColor: ["change", "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y", "24h_close_change|5"],
  blockSize: ["market_cap_basic", "market_cap_calc", "volume", "Value.Traded", "AUM"],
  changeMode: ["price-and-percent", "price-only", "percent-only"],
  chartType: ["area", "line", "candlesticks", "bars"],
  dataSource: ["SPX500", "AllUSEtf", "Crypto"],
  dateRange: ["1D", "5D", "1M", "3M", "6M", "12M", "YTD", "60M", "ALL"],
  defaultColumn: ["overview", "performance", "oscillators", "moving_averages"],
  defaultScreen: ["general", "most_capitalized", "volume_leaders", "top_gainers", "top_losers"],
  displayMode: ["regular", "compact", "adaptive", "single", "multiple"],
  feedMode: ["all_symbols", "market", "symbol"],
  grouping: ["sector", "industry", "asset_class", "no_group"],
  importanceFilter: ["-1,0,1", "0,1", "1"],
  market: ["america", "forex", "crypto", "indices", "futures", "cfd"],
  scaleMode: ["Normal", "Percentage", "Logarithmic"],
  scalePosition: ["right", "left", "no"],
  valuesTracking: ["0", "1"],
};

const BEHAVIOR_KEYS = new Set([
  "allow_symbol_change",
  "calendar",
  "hide_side_toolbar",
  "hide_top_toolbar",
  "hide_legend",
  "save_image",
  "showToolbar",
  "showIntervalTabs",
  "hideDateRanges",
  "hideMarketStatus",
  "noTimeScale",
  "hasTopBar",
  "isDataSetEnabled",
  "isZoomEnabled",
  "hasSymbolTooltip",
]);

const APPEARANCE_KEYS = new Set([
  "style",
  "chartType",
  "isTransparent",
  "displayMode",
  "showSymbolLogo",
  "hideSymbolLogo",
  "changeMode",
  "scalePosition",
  "scaleMode",
  "valuesTracking",
  "blockColor",
  "blockSize",
  "grouping",
  "dataSource",
  "market",
  "defaultColumn",
  "defaultScreen",
  "feedMode",
  "importanceFilter",
]);

export function getOptionSection(key: string): WizardOptionSection {
  if (BEHAVIOR_KEYS.has(key)) return "behavior";
  if (APPEARANCE_KEYS.has(key)) return "appearance";
  return "advanced";
}

export function isSimpleOptionValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function coerceLikeDefault(value: string, defaultValue: string | number): string | number {
  if (typeof defaultValue !== "number") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
}

export function ensureChoice(value: string, choices: string[]): string[] {
  return choices.includes(value) ? choices : [value, ...choices];
}

export function humanizeOptionName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
