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
  locale: string;
  timezone: string;
  showAttribution: boolean;
  lazyLoad: boolean;
  advancedYaml: string;
}

const INTERVALS = ["1", "5", "15", "30", "60", "240", "D", "W", "M"];
const THEMES = ["auto", "light", "dark"];

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

    this.formEl = contentEl.createDiv({ cls: "tradingview-widget-wizard-form" });
    this.renderForm(this.formEl);

    const previewWrap = contentEl.createDiv({ cls: "tradingview-widget-wizard-preview" });
    previewWrap.createEl("h3", { text: "Generated code block" });
    this.previewEl = previewWrap.createEl("textarea", {
      cls: "tradingview-widget-wizard-code",
      attr: { readonly: "true", rows: "14", spellcheck: "false" },
    }) as HTMLTextAreaElement;

    const actions = contentEl.createDiv({ cls: "tradingview-widget-wizard-actions" });
    actions.createEl("button", { text: "Copy", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.copyCodeBlock());
    });
    actions.createEl("button", { text: "Insert into note", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.insertCodeBlock());
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
        for (const widget of WIDGETS) dropdown.addOption(widget.id, humanizeWidgetName(widget.id));
        dropdown
          .setValue(this.state.widget)
          .onChange((value) => {
            const next = getWidgetDefinition(value) ?? WIDGETS[0];
            this.state = { ...this.createInitialState(next), theme: this.state.theme, locale: this.state.locale, lazyLoad: this.state.lazyLoad };
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

  private createInitialState(definition: TradingViewWidgetDefinition): WizardState {
    const settings = definition.defaultSettings;
    return {
      widget: definition.id,
      symbol: typeof settings.symbol === "string" ? settings.symbol : "NASDAQ:AAPL",
      symbolsText: defaultSymbolsText(settings.symbols),
      interval: typeof settings.interval === "string" ? settings.interval : "D",
      theme: "auto",
      height: String(definition.defaultHeight || this.plugin.settings.defaultHeight),
      locale: typeof settings.locale === "string" ? settings.locale : this.plugin.settings.defaultLocale,
      timezone: typeof settings.timezone === "string" ? settings.timezone : this.plugin.settings.defaultTimezone,
      showAttribution: this.plugin.settings.showAttribution,
      lazyLoad: this.plugin.settings.lazyLoadWidgets,
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

    if (this.state.locale) data.locale = this.state.locale;
    if (this.state.showAttribution !== this.plugin.settings.showAttribution) data.showAttribution = this.state.showAttribution;
    if (this.state.lazyLoad !== this.plugin.settings.lazyLoadWidgets) data.lazyLoad = this.state.lazyLoad;
    if (hasSetting(definition, "symbol") && this.state.symbol) data.symbol = this.state.symbol;
    if (hasSetting(definition, "symbols")) data.symbols = parseSymbolsText(this.state.symbolsText, definition.id);
    if (hasSetting(definition, "interval") && this.state.interval) data.interval = this.state.interval;
    if (hasSetting(definition, "timezone") && this.state.timezone) data.timezone = this.state.timezone;

    Object.assign(data, this.parseAdvancedYaml());

    const yaml = stringifyYaml(data).trimEnd();
    return `\`\`\`tradingview\n${yaml}\n\`\`\``;
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
