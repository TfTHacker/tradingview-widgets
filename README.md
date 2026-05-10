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

Use the command palette command **TradingView Widgets: Build TradingView widget code block** to open a guided widget builder. It lets you choose the widget type, symbol(s), interval, theme, height, locale, timezone, attribution, and optional advanced YAML, then copies or inserts the generated code block.

## Notes

- The plugin does not execute arbitrary raw script/HTML from notes.
- Widgets require internet access to TradingView's embed scripts.
- `theme: auto` follows Obsidian's current light/dark theme when the block renders.
