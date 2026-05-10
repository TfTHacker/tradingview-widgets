import { App, MarkdownView, Modal, Notice, SuggestModal } from "obsidian";
import type TradingViewWidgetsPlugin from "./main";
import { buildTradingViewCodeBlock, hasSetting } from "./wizard/codeblockBuilder";
import { createInitialWizardState, type WizardState } from "./wizard/state";
import { SymbolLookupForm, SymbolLookupModal, type TradingViewSymbolResult } from "./wizard/symbolLookup";
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
    description: "Insert a ticker list with one or more selected symbols.",
    searchText: "ticker list multiple quotes symbols",
  },
  {
    id: "ticker-tape",
    title: "Ticker Tape",
    description: "Insert a horizontal ticker tape with one or more selected symbols.",
    searchText: "ticker tape scrolling symbols multiple",
  },
  {
    id: "symbol-overview",
    title: "Symbol Overview",
    description: "Insert an overview chart with one or more selected symbols.",
    searchText: "symbol overview chart multiple",
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
      if (hasSetting(definition, "symbols")) {
        new MultiSymbolQuickInsertModal(this.app, this.plugin, definition, option.title).open();
        return;
      }

      new SymbolLookupModal(this.app, (symbol) => this.insertWidgetForSymbols(definition, [symbol]), {
        placeholder: `Search symbol for ${option.title}, e.g. MSFT, BTCUSD, EURUSD`,
      }).open();
    }, 0);
  }

  private insertWidgetForSymbols(definition: TradingViewWidgetDefinition, symbols: TradingViewSymbolResult[]): void {
    const state = createQuickInsertState(definition, this.plugin, symbols);
    const code = buildTradingViewCodeBlock(state, definition, this.plugin.settings);
    insertCodeBlockIntoActiveMarkdown(this.app, code);
  }
}

class MultiSymbolQuickInsertModal extends Modal {
  private selectedSymbols: TradingViewSymbolResult[] = [];
  private selectedEl: HTMLElement | null = null;
  private insertButton: HTMLButtonElement | null = null;
  private form: SymbolLookupForm | null = null;

  constructor(
    app: App,
    private readonly plugin: TradingViewWidgetsPlugin,
    private readonly definition: TradingViewWidgetDefinition,
    private readonly title: string,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("tradingview-multi-symbol-quick-insert-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Quick Insert ${this.title}` });
    contentEl.createEl("p", {
      cls: "tradingview-symbol-lookup-desc",
      text: "Search and add one or more symbols. Press Enter to add the highlighted result, then insert when your list is ready.",
    });

    this.selectedEl = contentEl.createDiv({ cls: "tradingview-multi-symbol-selection" });
    this.renderSelectedSymbols();

    const lookupEl = contentEl.createDiv({ cls: "tradingview-multi-symbol-lookup" });
    this.form = new SymbolLookupForm(this.app, lookupEl, (symbol) => this.addSymbol(symbol), {
      placeholder: `Search symbol to add to ${this.title}, e.g. MSFT, BTCUSD, EURUSD`,
    });

    const actions = contentEl.createDiv({ cls: "tradingview-multi-symbol-actions" });
    this.insertButton = actions.createEl("button", { text: "Insert", cls: "mod-cta" });
    this.insertButton.addEventListener("click", () => this.insertWidget());
    actions.createEl("button", { text: "Cancel" }, (button) => button.addEventListener("click", () => this.close()));

    this.updateInsertButton();
    window.setTimeout(() => this.form?.focus(), 50);
  }

  onClose(): void {
    this.form?.destroy();
    this.form = null;
    this.contentEl.empty();
  }

  private addSymbol(symbol: TradingViewSymbolResult): void {
    if (this.selectedSymbols.some((selected) => selected.fullName === symbol.fullName)) {
      new Notice(`${symbol.fullName} is already selected`);
      this.form?.focus();
      return;
    }

    this.selectedSymbols.push(symbol);
    this.renderSelectedSymbols();
    this.updateInsertButton();
    this.form?.focus();
  }

  private removeSymbol(symbol: TradingViewSymbolResult): void {
    this.selectedSymbols = this.selectedSymbols.filter((selected) => selected.fullName !== symbol.fullName);
    this.renderSelectedSymbols();
    this.updateInsertButton();
    this.form?.focus();
  }

  private renderSelectedSymbols(): void {
    if (!this.selectedEl) return;
    this.selectedEl.empty();

    if (this.selectedSymbols.length === 0) {
      this.selectedEl.createDiv({ cls: "tradingview-multi-symbol-empty", text: "No symbols selected yet." });
      return;
    }

    this.selectedEl.createDiv({ cls: "tradingview-multi-symbol-count", text: `${this.selectedSymbols.length} selected` });
    const list = this.selectedEl.createDiv({ cls: "tradingview-multi-symbol-list" });
    for (const symbol of this.selectedSymbols) {
      const item = list.createDiv({ cls: "tradingview-multi-symbol-chip" });
      item.createSpan({ cls: "tradingview-multi-symbol-chip-symbol", text: symbol.fullName });
      item.createSpan({ cls: "tradingview-multi-symbol-chip-title", text: symbol.description || symbol.symbol });
      item.createEl("button", { text: "×", cls: "tradingview-multi-symbol-remove", attr: { type: "button", "aria-label": `Remove ${symbol.fullName}` } }, (button) => {
        button.addEventListener("click", () => this.removeSymbol(symbol));
      });
    }
  }

  private updateInsertButton(): void {
    if (!this.insertButton) return;
    this.insertButton.disabled = this.selectedSymbols.length === 0;
  }

  private insertWidget(): void {
    if (this.selectedSymbols.length === 0) {
      new Notice("Select at least one TradingView symbol first.");
      return;
    }

    const state = createQuickInsertState(this.definition, this.plugin, this.selectedSymbols);
    const code = buildTradingViewCodeBlock(state, this.definition, this.plugin.settings);
    insertCodeBlockIntoActiveMarkdown(this.app, code);
    this.close();
  }
}

function createQuickInsertState(definition: TradingViewWidgetDefinition, plugin: TradingViewWidgetsPlugin, symbols: TradingViewSymbolResult[]): WizardState {
  const state = createInitialWizardState(definition, plugin.settings);
  const [firstSymbol] = symbols;
  if (firstSymbol) state.symbol = firstSymbol.fullName;

  if (hasSetting(definition, "symbols")) {
    state.symbolsText = symbols.map((symbol) => `${symbol.fullName} | ${symbol.description || symbol.symbol}`).join("\n");
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
