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

## Notes

- The plugin does not execute arbitrary raw script/HTML from notes.
- Widgets require internet access to TradingView's embed scripts.
- `theme: auto` follows Obsidian's current light/dark theme when the block renders.
