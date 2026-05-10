import type { TradingViewDefaults } from "./parser";

export interface TradingViewPluginSettings extends TradingViewDefaults {
  rerenderOnThemeChange: boolean;
  lazyLoadWidgets: boolean;
}

export const DEFAULT_SETTINGS: TradingViewPluginSettings = {
  defaultWidget: "advanced-chart",
  defaultHeight: 600,
  defaultLocale: "en",
  defaultTimezone: "Etc/UTC",
  showAttribution: false,
  rerenderOnThemeChange: true,
  lazyLoadWidgets: true,
};
