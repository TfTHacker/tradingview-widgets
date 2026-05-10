# TradingView Widgets for Obsidian

Render TradingView widgets from safe Markdown code blocks in Obsidian desktop and mobile.

````markdown
```tradingview
widget: advanced-chart
symbol: NASDAQ:AAPL
interval: D
theme: auto
height: 600
autosize: true
```
````

## Supported widget IDs

- `advanced-chart`
- `symbol-overview`
- `mini-symbol-overview`
- `ticker-tape`
- `ticker`
- `market-overview`
- `market-data`
- `stock-heatmap`
- `forex-heatmap`
- `crypto-coins-heatmap`
- `screener`
- `technical-analysis`
- `symbol-info`
- `company-profile`
- `top-stories`
- `economic-calendar`

## Wizard

Use the command palette command **TradingView Widgets: Widget Wizard** to open a guided widget builder. It lets you choose the widget type, symbol(s), interval, theme, height, locale, timezone, attribution, lazy loading, widget-specific TradingView options, and optional advanced YAML, then copies or inserts the generated code block.

## Notes

- The plugin does not execute arbitrary raw script/HTML from notes.
- Widgets require internet access to TradingView's embed scripts.
- Widgets lazy-load by default when they approach the viewport to reduce offscreen iframe work. Override per block with `lazyLoad: false`.
- `theme: auto` follows Obsidian's current light/dark theme when the block renders.
