import { App, MarkdownView, Notice, SuggestModal } from "obsidian";
import type TradingViewWidgetsPlugin from "./main";
import { buildTradingViewCodeBlock, hasSetting } from "./wizard/codeblockBuilder";
import { createInitialWizardState, type WizardState } from "./wizard/state";
import { SymbolLookupModal, type TradingViewSymbolResult } from "./wizard/symbolLookup";
import { getWidgetDefinition, type TradingViewWidgetDefinition } from "./widgets";

interface QuickInsertOption {
  id: string;
  title: string;
  description: string;
  searchText: string;
}

const QUICK_INSERT_OPTIONS: QuickInsertOption[] = [
  {
    id: "advanced-chart",
    title: "Chart",
    description: "Insert a full TradingView advanced chart for one symbol.",
    searchText: "chart advanced candlestick price",
  },
  {
    id: "mini-symbol-overview",
    title: "Mini Chart",
    description: "Insert a compact mini chart for one symbol.",
    searchText: "mini chart compact sparkline",
  },
  {
    id: "ticker",
    title: "Single Ticker",
    description: "Insert a single quote/ticker widget for one symbol.",
    searchText: "single ticker quote price",
  },
  {
    id: "tickers",
    title: "Ticker List",
    description: "Insert a ticker list seeded with the selected symbol.",
    searchText: "ticker list multiple quotes",
  },
  {
    id: "ticker-tape",
    title: "Ticker Tape",
    description: "Insert a horizontal ticker tape seeded with the selected symbol.",
    searchText: "ticker tape scrolling symbols",
  },
  {
    id: "symbol-overview",
    title: "Symbol Overview",
    description: "Insert an overview chart seeded with the selected symbol.",
    searchText: "symbol overview chart",
  },
  {
    id: "symbol-info",
    title: "Symbol Info",
    description: "Insert a company/instrument info widget for one symbol.",
    searchText: "symbol info details",
  },
  {
    id: "technical-analysis",
    title: "Technical Analysis",
    description: "Insert a TradingView technical analysis widget for one symbol.",
    searchText: "technical analysis ta rating indicator",
  },
  {
    id: "company-profile",
    title: "Company Profile",
    description: "Insert a company profile widget for one symbol.",
    searchText: "company profile business description",
  },
  {
    id: "fundamental-data",
    title: "Fundamental Data",
    description: "Insert financial and fundamental data for one symbol.",
    searchText: "fundamental financial data income statement balance sheet",
  },
];

export class TradingViewQuickInsertModal extends SuggestModal<QuickInsertOption> {
  constructor(app: App, private readonly plugin: TradingViewWidgetsPlugin) {
    super(app);
    this.setPlaceholder("Choose a TradingView widget to quick insert…");
  }

  getSuggestions(query: string): QuickInsertOption[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return QUICK_INSERT_OPTIONS;
    return QUICK_INSERT_OPTIONS.filter((option) => {
      const definition = getWidgetDefinition(option.id);
      const haystack = [option.title, option.description, option.searchText, definition?.displayName, definition?.id, ...(definition?.aliases ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }

  renderSuggestion(option: QuickInsertOption, el: HTMLElement): void {
    el.addClass("tradingview-quick-insert-suggestion");
    el.createDiv({ cls: "tradingview-quick-insert-suggestion-title", text: option.title });
    el.createDiv({ cls: "tradingview-quick-insert-suggestion-desc", text: option.description });
  }

  onChooseSuggestion(option: QuickInsertOption): void {
    const definition = getWidgetDefinition(option.id);
    if (!definition) {
      new Notice(`TradingView widget is not available: ${option.id}`);
      return;
    }

    window.setTimeout(() => {
      new SymbolLookupModal(this.app, (symbol) => this.insertWidgetForSymbol(definition, symbol), {
        placeholder: `Search symbol for ${option.title}, e.g. MSFT, BTCUSD, EURUSD`,
      }).open();
    }, 0);
  }

  private insertWidgetForSymbol(definition: TradingViewWidgetDefinition, symbol: TradingViewSymbolResult): void {
    const state = createQuickInsertState(definition, this.plugin, symbol);
    const code = buildTradingViewCodeBlock(state, definition, this.plugin.settings);
    insertCodeBlockIntoActiveMarkdown(this.app, code);
  }
}

function createQuickInsertState(definition: TradingViewWidgetDefinition, plugin: TradingViewWidgetsPlugin, symbol: TradingViewSymbolResult): WizardState {
  const state = createInitialWizardState(definition, plugin.settings);
  state.symbol = symbol.fullName;

  if (hasSetting(definition, "symbols")) {
    state.symbolsText = `${symbol.fullName} | ${symbol.description || symbol.symbol}`;
  }

  return state;
}

function insertCodeBlockIntoActiveMarkdown(app: App, code: string): void {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) {
    void navigator.clipboard.writeText(code);
    new Notice("No active Markdown editor. TradingView code block copied instead.");
    return;
  }

  view.editor.replaceSelection(`${code}\n`);
  new Notice("TradingView widget inserted");
}
