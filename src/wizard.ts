import { App, MarkdownView, Modal, Notice, Setting } from "obsidian";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type TradingViewWidgetsPlugin from "./main";
import { WIDGETS, getWidgetDefinition, type TradingViewWidgetDefinition } from "./widgets";

interface WizardState {
  widget: string;
  symbol: string;
  symbolsText: string;
  interval: string;
  theme: string;
  height: string;
  width: string;
  locale: string;
  timezone: string;
  showAttribution: boolean;
  lazyLoad: boolean;
  extraOptions: Record<string, unknown>;
  extraOptionText: Record<string, string>;
  advancedYaml: string;
}

const INTERVALS = ["1", "5", "15", "30", "60", "240", "D", "W", "M"];
const THEMES = ["auto", "light", "dark"];
const BASIC_SETTING_KEYS = new Set(["symbol", "symbols", "interval", "locale", "timezone", "theme", "colorTheme", "width", "height"]);
const OPTION_CHOICES: Record<string, string[]> = {
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

export class TradingViewWizardModal extends Modal {
  private plugin: TradingViewWidgetsPlugin;
  private state: WizardState;
  private formEl: HTMLElement | null = null;
  private previewEl: HTMLTextAreaElement | null = null;

  constructor(app: App, plugin: TradingViewWidgetsPlugin) {
    super(app);
    this.plugin = plugin;
    const definition = getWidgetDefinition(plugin.settings.defaultWidget) ?? WIDGETS[0];
    this.state = this.createInitialState(definition);
  }

  onOpen(): void {
    this.modalEl.addClass("tradingview-widget-wizard-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
    this.formEl = null;
    this.previewEl = null;
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "TradingView Widget Wizard" });
    contentEl.createEl("p", {
      cls: "tradingview-widget-wizard-desc",
      text: "Build a safe ```tradingview``` code block, then insert it into the active note.",
    });

    const layout = contentEl.createDiv({ cls: "tradingview-widget-wizard-layout" });

    this.formEl = layout.createDiv({ cls: "tradingview-widget-wizard-form" });
    this.renderForm(this.formEl);

    const sidePanel = layout.createDiv({ cls: "tradingview-widget-wizard-side-panel" });
    const previewWrap = sidePanel.createDiv({ cls: "tradingview-widget-wizard-preview" });
    previewWrap.createEl("h3", { text: "Generated code block" });
    this.previewEl = previewWrap.createEl("textarea", {
      cls: "tradingview-widget-wizard-code",
      attr: { readonly: "true", rows: "14", spellcheck: "false" },
    }) as HTMLTextAreaElement;

    const actions = sidePanel.createDiv({ cls: "tradingview-widget-wizard-actions" });
    actions.createEl("button", { text: "Insert into note", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.insertCodeBlock());
    });
    actions.createEl("button", { text: "Copy", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.copyCodeBlock());
    });
    actions.createEl("button", { text: "Close" }, (button) => {
      button.addEventListener("click", () => this.close());
    });

    this.updatePreview();
  }

  private renderForm(containerEl: HTMLElement): void {
    const definition = this.currentDefinition();

    new Setting(containerEl)
      .setName("Widget type")
      .setDesc("Choose the TradingView widget to embed.")
      .addDropdown((dropdown) => {
        for (const widget of WIDGETS) dropdown.addOption(widget.id, widget.displayName);
        dropdown
          .setValue(this.state.widget)
          .onChange((value) => {
            const next = getWidgetDefinition(value) ?? WIDGETS[0];
            this.state = {
              ...this.createInitialState(next),
              theme: this.state.theme,
              width: this.state.width,
              locale: this.state.locale,
              lazyLoad: this.state.lazyLoad,
            };
            this.render();
          });
      });

    if (hasSetting(definition, "symbol")) {
      new Setting(containerEl)
        .setName("Symbol")
        .setDesc("TradingView symbol, e.g. NASDAQ:AAPL, NASDAQ:NVDA, FX:EURUSD, BITSTAMP:BTCUSD.")
        .addText((text) => text
          .setPlaceholder("NASDAQ:AAPL")
          .setValue(this.state.symbol)
          .onChange((value) => {
            this.state.symbol = value.trim();
            this.updatePreview();
          }));
    }

    if (hasSetting(definition, "symbols")) {
      new Setting(containerEl)
        .setName("Symbols")
        .setDesc("One per line. Use SYMBOL or SYMBOL | Title. Example: NASDAQ:AAPL | Apple")
        .addTextArea((textarea) => textarea
          .setPlaceholder("NASDAQ:AAPL | Apple\nNASDAQ:MSFT | Microsoft")
          .setValue(this.state.symbolsText)
          .onChange((value) => {
            this.state.symbolsText = value;
            this.updatePreview();
          }));
    }

    if (hasSetting(definition, "interval")) {
      new Setting(containerEl)
        .setName("Interval")
        .setDesc("Chart interval. D = daily, W = weekly, M = monthly.")
        .addDropdown((dropdown) => {
          for (const interval of INTERVALS) dropdown.addOption(interval, interval);
          dropdown
            .setValue(this.state.interval)
            .onChange((value) => {
              this.state.interval = value;
              this.updatePreview();
            });
        });
    }

    new Setting(containerEl)
      .setName("Theme")
      .setDesc("auto follows Obsidian's current light/dark theme.")
      .addDropdown((dropdown) => {
        for (const theme of THEMES) dropdown.addOption(theme, theme);
        dropdown
          .setValue(this.state.theme)
          .onChange((value) => {
            this.state.theme = value;
            this.updatePreview();
          });
      });

    new Setting(containerEl)
      .setName("Height (px)")
      .setDesc("Widget height in pixels. This is written as the block's height option.")
      .addText((text) => text
        .setPlaceholder(String(definition.defaultHeight))
        .setValue(this.state.height)
        .onChange((value) => {
          this.state.height = value.trim();
          this.updatePreview();
        }));

    new Setting(containerEl)
      .setName("Width")
      .setDesc("Widget width. Use 100% for full note width, or values like 600px, 80%, 50vw, 40rem.")
      .addText((text) => text
        .setPlaceholder("100%")
        .setValue(this.state.width)
        .onChange((value) => {
          this.state.width = value.trim();
          this.updatePreview();
        }));

    new Setting(containerEl)
      .setName("Locale")
      .setDesc("TradingView locale, e.g. en, es, de_DE.")
      .addText((text) => text
        .setPlaceholder(this.plugin.settings.defaultLocale)
        .setValue(this.state.locale)
        .onChange((value) => {
          this.state.locale = value.trim();
          this.updatePreview();
        }));

    if (hasSetting(definition, "timezone")) {
      new Setting(containerEl)
        .setName("Timezone")
        .setDesc("Used by chart widgets.")
        .addText((text) => text
          .setPlaceholder(this.plugin.settings.defaultTimezone)
          .setValue(this.state.timezone)
          .onChange((value) => {
            this.state.timezone = value.trim();
            this.updatePreview();
          }));
    }

    new Setting(containerEl)
      .setName("Show TradingView attribution")
      .setDesc("Adds the standard TradingView attribution line below the widget.")
      .addToggle((toggle) => toggle
        .setValue(this.state.showAttribution)
        .onChange((value) => {
          this.state.showAttribution = value;
          this.updatePreview();
        }));

    new Setting(containerEl)
      .setName("Lazy load widget")
      .setDesc("Load this widget only when it approaches the viewport.")
      .addToggle((toggle) => toggle
        .setValue(this.state.lazyLoad)
        .onChange((value) => {
          this.state.lazyLoad = value;
          this.updatePreview();
        }));

    this.renderExtraOptionFields(containerEl, definition);

    new Setting(containerEl)
      .setName("Advanced YAML options")
      .setDesc("Optional TradingView settings merged into the code block. Use this for widget-specific options not exposed above.")
      .addTextArea((textarea) => textarea
        .setPlaceholder("hide_side_toolbar: true\ncalendar: false")
        .setValue(this.state.advancedYaml)
        .onChange((value) => {
          this.state.advancedYaml = value;
          this.updatePreview();
        }));
  }

  private renderExtraOptionFields(containerEl: HTMLElement, definition: TradingViewWidgetDefinition): void {
    const keys = getExtraOptionKeys(definition);
    if (!keys.length) return;

    containerEl.createEl("h3", { text: "Widget-specific options" });

    for (const key of keys) {
      const defaultValue = definition.defaultSettings[key];
      const label = humanizeOptionName(key);
      const setting = new Setting(containerEl)
        .setName(label)
        .setDesc(`TradingView option: ${key}`);

      if (typeof defaultValue === "boolean") {
        setting.addToggle((toggle) => toggle
          .setValue(Boolean(this.state.extraOptions[key]))
          .onChange((value) => {
            this.state.extraOptions[key] = value;
            this.updatePreview();
          }));
        continue;
      }

      if (typeof defaultValue === "string" && OPTION_CHOICES[key]) {
        setting.addDropdown((dropdown) => {
          for (const option of ensureChoice(String(this.state.extraOptions[key] ?? defaultValue), OPTION_CHOICES[key])) {
            dropdown.addOption(option, option);
          }
          dropdown
            .setValue(String(this.state.extraOptions[key] ?? defaultValue))
            .onChange((value) => {
              this.state.extraOptions[key] = value;
              this.updatePreview();
            });
        });
        continue;
      }

      if (typeof defaultValue === "number" || typeof defaultValue === "string") {
        setting.addText((text) => text
          .setPlaceholder(String(defaultValue))
          .setValue(String(this.state.extraOptions[key] ?? ""))
          .onChange((value) => {
            this.state.extraOptions[key] = coerceLikeDefault(value.trim(), defaultValue);
            this.updatePreview();
          }));
        continue;
      }

      setting.addTextArea((textarea) => textarea
        .setPlaceholder(stringifyYaml(defaultValue).trimEnd())
        .setValue(this.state.extraOptionText[key] ?? stringifyYaml(defaultValue).trimEnd())
        .onChange((value) => {
          this.state.extraOptionText[key] = value;
          this.updatePreview();
        }));
    }
  }

  private createInitialState(definition: TradingViewWidgetDefinition): WizardState {
    const settings = definition.defaultSettings;
    const extraOptions: Record<string, unknown> = {};
    const extraOptionText: Record<string, string> = {};
    for (const key of getExtraOptionKeys(definition)) {
      const value = settings[key];
      if (isSimpleOptionValue(value)) extraOptions[key] = value;
      else extraOptionText[key] = stringifyYaml(value).trimEnd();
    }

    return {
      widget: definition.id,
      symbol: typeof settings.symbol === "string" ? settings.symbol : "NASDAQ:AAPL",
      symbolsText: defaultSymbolsText(settings.symbols),
      interval: typeof settings.interval === "string" ? settings.interval : "D",
      theme: "auto",
      height: String(definition.defaultHeight || this.plugin.settings.defaultHeight),
      width: "100%",
      locale: typeof settings.locale === "string" ? settings.locale : this.plugin.settings.defaultLocale,
      timezone: typeof settings.timezone === "string" ? settings.timezone : this.plugin.settings.defaultTimezone,
      showAttribution: this.plugin.settings.showAttribution,
      lazyLoad: this.plugin.settings.lazyLoadWidgets,
      extraOptions,
      extraOptionText,
      advancedYaml: "",
    };
  }

  private currentDefinition(): TradingViewWidgetDefinition {
    return getWidgetDefinition(this.state.widget) ?? WIDGETS[0];
  }

  private buildCodeBlock(): string {
    const definition = this.currentDefinition();
    const data: Record<string, unknown> = {
      widget: definition.id,
      theme: this.state.theme,
      height: numericOrString(this.state.height),
    };

    if (this.state.width && this.state.width !== "100%") data.width = numericOrString(this.state.width);

    if (this.state.locale) data.locale = this.state.locale;
    if (this.state.showAttribution !== this.plugin.settings.showAttribution) data.showAttribution = this.state.showAttribution;
    if (this.state.lazyLoad !== this.plugin.settings.lazyLoadWidgets) data.lazyLoad = this.state.lazyLoad;
    if (hasSetting(definition, "symbol") && this.state.symbol) data.symbol = this.state.symbol;
    if (hasSetting(definition, "symbols")) data.symbols = parseSymbolsText(this.state.symbolsText, definition.id);
    if (hasSetting(definition, "interval") && this.state.interval) data.interval = this.state.interval;
    if (hasSetting(definition, "timezone") && this.state.timezone) data.timezone = this.state.timezone;

    Object.assign(data, this.getChangedExtraOptions(definition));
    Object.assign(data, this.parseAdvancedYaml());

    const yaml = stringifyYaml(data).trimEnd();
    return `\`\`\`tradingview\n${yaml}\n\`\`\``;
  }

  private getChangedExtraOptions(definition: TradingViewWidgetDefinition): Record<string, unknown> {
    const changed: Record<string, unknown> = {};
    for (const key of getExtraOptionKeys(definition)) {
      const defaultValue = definition.defaultSettings[key];
      let value: unknown;

      if (isSimpleOptionValue(defaultValue)) {
        value = this.state.extraOptions[key];
      } else {
        value = parseYamlValue(this.state.extraOptionText[key]);
      }

      if (!isSameValue(value, defaultValue)) changed[key] = value;
    }
    return changed;
  }

  private parseAdvancedYaml(): Record<string, unknown> {
    const trimmed = this.state.advancedYaml.trim();
    if (!trimmed) return {};
    try {
      const parsed = parseYaml(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      return {};
    } catch {
      return {};
    }
  }

  private updatePreview(): void {
    if (!this.previewEl) return;
    this.previewEl.value = this.buildCodeBlock();
    this.previewEl.toggleClass("has-yaml-error", this.hasAdvancedYamlError());
  }

  private hasAdvancedYamlError(): boolean {
    if (!this.state.advancedYaml.trim()) return false;
    try {
      parseYaml(this.state.advancedYaml);
      return false;
    } catch {
      return true;
    }
  }

  private async copyCodeBlock(): Promise<void> {
    const code = this.buildCodeBlock();
    await navigator.clipboard.writeText(code);
    new Notice("TradingView widget code block copied");
  }

  private insertCodeBlock(): void {
    const code = this.buildCodeBlock();
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      void navigator.clipboard.writeText(code);
      new Notice("No active Markdown editor. Code block copied instead.");
      return;
    }

    view.editor.replaceSelection(`${code}\n`);
    new Notice("TradingView widget code block inserted");
    this.close();
  }
}

function hasSetting(definition: TradingViewWidgetDefinition, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(definition.defaultSettings, key);
}

function getExtraOptionKeys(definition: TradingViewWidgetDefinition): string[] {
  return Object.keys(definition.defaultSettings).filter((key) => !BASIC_SETTING_KEYS.has(key));
}

function isSimpleOptionValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function coerceLikeDefault(value: string, defaultValue: string | number): string | number {
  if (typeof defaultValue !== "number") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
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

function ensureChoice(value: string, choices: string[]): string[] {
  return choices.includes(value) ? choices : [value, ...choices];
}

function humanizeOptionName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeWidgetName(id: string): string {
  return id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function numericOrString(value: string): string | number {
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && trimmed !== "" ? numeric : trimmed;
}

function defaultSymbolsText(value: unknown): string {
  if (!Array.isArray(value)) return "NASDAQ:AAPL | Apple\nNASDAQ:MSFT | Microsoft\nNASDAQ:NVDA | Nvidia";
  return value.map((item) => {
    if (Array.isArray(item)) return `${String(item[1] ?? item[0] ?? "").split("|")[0]} | ${String(item[0] ?? "")}`;
    if (item && typeof item === "object" && "proName" in item) {
      const record = item as { proName?: unknown; title?: unknown };
      return `${String(record.proName ?? "")} | ${String(record.title ?? "")}`;
    }
    return String(item ?? "");
  }).filter(Boolean).join("\n");
}

function parseSymbolsText(value: string, widgetId: string): unknown[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fallback = ["NASDAQ:AAPL | Apple", "NASDAQ:MSFT | Microsoft", "NASDAQ:NVDA | Nvidia"];
  const source = lines.length ? lines : fallback;

  if (widgetId === "symbol-overview") {
    return source.map((line) => {
      const [symbolPart, titlePart] = splitSymbolLine(line);
      const title = titlePart || symbolPart;
      return [title, `${symbolPart}|1D`];
    });
  }

  return source.map((line) => {
    const [symbolPart, titlePart] = splitSymbolLine(line);
    return { proName: symbolPart, title: titlePart || symbolPart };
  });
}

function splitSymbolLine(line: string): [string, string] {
  const [symbolRaw, titleRaw] = line.split("|");
  return [(symbolRaw ?? "").trim(), (titleRaw ?? "").trim()];
}
