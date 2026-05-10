import { App, Modal, Notice, requestUrl } from "obsidian";

export interface TradingViewSymbolResult {
  symbol: string;
  fullName: string;
  description: string;
  exchange: string;
  type: string;
  country: string;
}

interface TradingViewSymbolSearchResponseItem {
  symbol?: unknown;
  description?: unknown;
  exchange?: unknown;
  source_id?: unknown;
  type?: unknown;
  country?: unknown;
}

export class SymbolLookupModal extends Modal {
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private requestId = 0;

  constructor(app: App, private readonly onChoose: (result: TradingViewSymbolResult) => void) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("tradingview-symbol-lookup-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Lookup TradingView Symbol" });
    contentEl.createEl("p", {
      cls: "tradingview-symbol-lookup-desc",
      text: "Search TradingView symbols, then choose one to insert into the widget wizard.",
    });

    this.inputEl = contentEl.createEl("input", {
      cls: "tradingview-symbol-lookup-input",
      attr: { type: "search", placeholder: "Search symbol or company, e.g. MSFT, Tesla, BTCUSD" },
    });
    this.inputEl.addEventListener("input", () => this.scheduleSearch());
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void this.searchNow();
      }
    });

    this.statusEl = contentEl.createDiv({ cls: "tradingview-symbol-lookup-status", text: "Type at least 2 characters to search." });
    this.resultsEl = contentEl.createDiv({ cls: "tradingview-symbol-lookup-results" });

    window.setTimeout(() => this.inputEl?.focus(), 50);
  }

  onClose(): void {
    if (this.debounceTimer != null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.contentEl.empty();
  }

  private scheduleSearch(): void {
    if (this.debounceTimer != null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      void this.searchNow();
    }, 300);
  }

  private async searchNow(): Promise<void> {
    const query = this.inputEl?.value.trim() ?? "";
    const currentRequestId = ++this.requestId;

    if (query.length < 2) {
      this.renderResults([]);
      this.setStatus("Type at least 2 characters to search.");
      return;
    }

    this.setStatus("Searching TradingView…");
    try {
      const results = await searchTradingViewSymbols(query);
      if (currentRequestId !== this.requestId) return;
      this.renderResults(results);
      this.setStatus(results.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : "No matching TradingView symbols found.");
    } catch (error) {
      if (currentRequestId !== this.requestId) return;
      const message = error instanceof Error ? error.message : String(error);
      this.renderResults([]);
      this.setStatus("Symbol lookup failed.");
      new Notice(`TradingView symbol lookup failed: ${message}`);
    }
  }

  private renderResults(results: TradingViewSymbolResult[]): void {
    if (!this.resultsEl) return;
    this.resultsEl.empty();

    for (const result of results) {
      const item = this.resultsEl.createEl("button", { cls: "tradingview-symbol-lookup-result" });
      const primary = item.createDiv({ cls: "tradingview-symbol-lookup-result-primary" });
      primary.createSpan({ cls: "tradingview-symbol-lookup-result-symbol", text: result.fullName });
      primary.createSpan({ cls: "tradingview-symbol-lookup-result-type", text: result.type || "symbol" });
      item.createDiv({ cls: "tradingview-symbol-lookup-result-desc", text: result.description || result.symbol });
      item.createDiv({ cls: "tradingview-symbol-lookup-result-meta", text: [result.exchange, result.country].filter(Boolean).join(" · ") });
      item.addEventListener("click", () => {
        this.onChoose(result);
        this.close();
      });
    }
  }

  private setStatus(message: string): void {
    this.statusEl?.setText(message);
  }
}

export async function searchTradingViewSymbols(query: string): Promise<TradingViewSymbolResult[]> {
  const params = new URLSearchParams({
    text: query,
    hl: "1",
    exchange: "",
    lang: "en",
    type: "",
    domain: "production",
    sort_by_country: "US",
  });
  const url = `https://symbol-search.tradingview.com/symbol_search/?${params.toString()}`;
  const response = await requestUrl({
    url,
    headers: {
      Accept: "application/json,text/plain,*/*",
      Origin: "https://www.tradingview.com",
      Referer: "https://www.tradingview.com/",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  const items = Array.isArray(response.json) ? response.json as TradingViewSymbolSearchResponseItem[] : JSON.parse(response.text) as TradingViewSymbolSearchResponseItem[];
  return items.slice(0, 20).map(normalizeTradingViewSymbol).filter((item): item is TradingViewSymbolResult => item != null);
}

function normalizeTradingViewSymbol(item: TradingViewSymbolSearchResponseItem): TradingViewSymbolResult | null {
  const symbol = stripHtml(String(item.symbol ?? "")).trim();
  const exchange = String(item.exchange ?? item.source_id ?? "").trim();
  if (!symbol || !exchange) return null;

  return {
    symbol,
    fullName: `${exchange}:${symbol}`,
    description: stripHtml(String(item.description ?? "")).trim(),
    exchange,
    type: String(item.type ?? "").trim(),
    country: String(item.country ?? "").trim(),
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
