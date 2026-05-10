export interface TradingViewWidgetDefinition {
  id: string;
  aliases: string[];
  script: string;
  defaultHeight: number;
  defaultSettings: Record<string, unknown>;
}

const EXTERNAL_EMBED_BASE = "https://s3.tradingview.com/external-embedding";

export const WIDGETS: TradingViewWidgetDefinition[] = [
  {
    id: "advanced-chart",
    aliases: ["advanced", "chart"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-advanced-chart.js`,
    defaultHeight: 600,
    defaultSettings: {
      symbol: "NASDAQ:AAPL",
      interval: "D",
      timezone: "Etc/UTC",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      autosize: true,
    },
  },
  {
    id: "symbol-overview",
    aliases: ["overview", "symbol"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-symbol-overview.js`,
    defaultHeight: 420,
    defaultSettings: {
      symbols: [["Apple", "AAPL|1D"], ["Google", "GOOGL|1D"], ["Microsoft", "MSFT|1D"]],
      chartOnly: false,
      locale: "en",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
    },
  },
  {
    id: "mini-symbol-overview",
    aliases: ["mini-chart", "mini"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-mini-symbol-overview.js`,
    defaultHeight: 220,
    defaultSettings: {
      symbol: "NASDAQ:AAPL",
      locale: "en",
      dateRange: "12M",
      colorTheme: "light",
      isTransparent: false,
      autosize: true,
      largeChartUrl: "",
    },
  },
  {
    id: "ticker-tape",
    aliases: ["tape"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-ticker-tape.js`,
    defaultHeight: 80,
    defaultSettings: {
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
      ],
      showSymbolLogo: true,
      locale: "en",
      isTransparent: false,
      displayMode: "adaptive",
    },
  },
  {
    id: "ticker",
    aliases: ["single-ticker"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-single-quote.js`,
    defaultHeight: 120,
    defaultSettings: { symbol: "NASDAQ:AAPL", locale: "en", isTransparent: false },
  },
  {
    id: "market-overview",
    aliases: ["markets-overview"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-market-overview.js`,
    defaultHeight: 500,
    defaultSettings: { colorTheme: "light", dateRange: "12M", showChart: true, locale: "en", largeChartUrl: "", isTransparent: false, showSymbolLogo: true, tabs: [] },
  },
  {
    id: "market-data",
    aliases: ["market-quotes"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-market-quotes.js`,
    defaultHeight: 500,
    defaultSettings: { colorTheme: "light", locale: "en", largeChartUrl: "", isTransparent: false, showSymbolLogo: true },
  },
  {
    id: "stock-heatmap",
    aliases: ["heatmap", "stocks-heatmap"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-stock-heatmap.js`,
    defaultHeight: 500,
    defaultSettings: { exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", locale: "en", symbolUrl: "", colorTheme: "light", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" },
  },
  {
    id: "forex-heatmap",
    aliases: ["fx-heatmap"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-forex-heat-map.js`,
    defaultHeight: 500,
    defaultSettings: { currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"], isTransparent: false, colorTheme: "light", locale: "en" },
  },
  {
    id: "crypto-coins-heatmap",
    aliases: ["crypto-heatmap"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-crypto-coins-heatmap.js`,
    defaultHeight: 500,
    defaultSettings: { dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", locale: "en", symbolUrl: "", colorTheme: "light", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, width: "100%", height: "100%" },
  },
  {
    id: "screener",
    aliases: ["stock-screener"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-screener.js`,
    defaultHeight: 550,
    defaultSettings: { defaultColumn: "overview", defaultScreen: "most_capitalized", market: "america", showToolbar: true, colorTheme: "light", locale: "en" },
  },
  {
    id: "technical-analysis",
    aliases: ["ta"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-technical-analysis.js`,
    defaultHeight: 450,
    defaultSettings: { interval: "1m", symbol: "NASDAQ:AAPL", showIntervalTabs: true, displayMode: "single", locale: "en", colorTheme: "light", isTransparent: false },
  },
  {
    id: "symbol-info",
    aliases: ["info"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-symbol-info.js`,
    defaultHeight: 240,
    defaultSettings: { symbol: "NASDAQ:AAPL", locale: "en", colorTheme: "light", isTransparent: false },
  },
  {
    id: "company-profile",
    aliases: ["profile"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-symbol-profile.js`,
    defaultHeight: 420,
    defaultSettings: { symbol: "NASDAQ:AAPL", locale: "en", colorTheme: "light", isTransparent: false },
  },
  {
    id: "top-stories",
    aliases: ["news"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-timeline.js`,
    defaultHeight: 500,
    defaultSettings: { feedMode: "all_symbols", isTransparent: false, displayMode: "regular", colorTheme: "light", locale: "en" },
  },
  {
    id: "economic-calendar",
    aliases: ["calendar"],
    script: `${EXTERNAL_EMBED_BASE}/embed-widget-events.js`,
    defaultHeight: 550,
    defaultSettings: { colorTheme: "light", isTransparent: false, locale: "en", importanceFilter: "-1,0,1" },
  },
];

export function getWidgetDefinition(input: unknown): TradingViewWidgetDefinition | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const normalized = input.trim().toLowerCase();
  return WIDGETS.find((widget) => widget.id === normalized || widget.aliases.includes(normalized)) ?? null;
}

export function supportedWidgetNames(): string {
  return WIDGETS.map((widget) => widget.id).join(", ");
}
