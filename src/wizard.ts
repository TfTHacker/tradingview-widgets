import { App, MarkdownView, Modal, Notice, Setting } from "obsidian";
import type TradingViewWidgetsPlugin from "./main";
import { WIDGETS, getWidgetDefinition, type TradingViewWidgetDefinition } from "./widgets";
import { buildTradingViewCodeBlock, hasAdvancedYamlError, hasSetting } from "./wizard/codeblockBuilder";
import { INTERVALS, THEMES } from "./wizard/optionMetadata";
import { renderExtraOptionFields } from "./wizard/optionControls";
import { createWizardSections } from "./wizard/sections";
import { createInitialWizardState, type WizardState } from "./wizard/state";
import { SymbolLookupModal, type TradingViewSymbolResult } from "./wizard/symbolLookup";
import { decorateDropdown } from "./wizard/uiDecorators";

export class TradingViewWizardModal extends Modal {
  private plugin: TradingViewWidgetsPlugin;
  private state: WizardState;

  constructor(app: App, plugin: TradingViewWidgetsPlugin) {
    super(app);
    this.plugin = plugin;
    const definition = getWidgetDefinition(plugin.settings.defaultWidget) ?? WIDGETS[0];
    this.state = createInitialWizardState(definition, plugin.settings);
  }

  onOpen(): void {
    this.modalEl.addClass("tradingview-widget-wizard-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "TradingView Widget Wizard" });

    const formEl = contentEl.createDiv({ cls: "tradingview-widget-wizard-form" });
    this.renderForm(formEl);

    const actions = contentEl.createDiv({ cls: "tradingview-widget-wizard-actions" });
    actions.createEl("button", { text: "Insert into note", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.insertCodeBlock());
    });
    actions.createEl("button", { text: "Copy", cls: "mod-cta" }, (button) => {
      button.addEventListener("click", () => this.copyCodeBlock());
    });
    actions.createEl("button", { text: "Close" }, (button) => {
      button.addEventListener("click", () => this.close());
    });
  }

  private renderForm(containerEl: HTMLElement): void {
    const definition = this.currentDefinition();
    const sections = createWizardSections(containerEl);
    const onChange = () => this.handleStateChanged();

    new Setting(sections.basicSection)
      .setName("Widget type")
      .setDesc("Choose the TradingView widget to embed.")
      .addDropdown((dropdown) => {
        for (const widget of WIDGETS) dropdown.addOption(widget.id, widget.displayName);
        decorateDropdown(dropdown.selectEl);
        dropdown
          .setValue(this.state.widget)
          .onChange((value) => {
            const next = getWidgetDefinition(value) ?? WIDGETS[0];
            this.state = {
              ...createInitialWizardState(next, this.plugin.settings),
              theme: this.state.theme,
              width: this.state.width,
              locale: this.state.locale,
              lazyLoad: this.state.lazyLoad,
            };
            this.render();
          });
      });

    if (hasSetting(definition, "symbol")) {
      new Setting(sections.basicSection)
        .setName("Symbol")
        .setDesc("TradingView symbol, e.g. NASDAQ:AAPL, NASDAQ:NVDA, FX:EURUSD, BITSTAMP:BTCUSD.")
        .addText((text) => text
          .setPlaceholder("NASDAQ:AAPL")
          .setValue(this.state.symbol)
          .onChange((value) => {
            this.state.symbol = value.trim();
            onChange();
          }))
        .addButton((button) => button
          .setButtonText("Lookup")
          .setTooltip("Search TradingView symbols")
          .onClick(() => this.openSymbolLookup((result) => {
            this.state.symbol = result.fullName;
            this.render();
          })));
    }

    if (hasSetting(definition, "symbols")) {
      new Setting(sections.basicSection)
        .setName("Symbols")
        .setDesc("One per line. Use SYMBOL or SYMBOL | Title. Example: NASDAQ:AAPL | Apple")
        .addTextArea((textarea) => textarea
          .setPlaceholder("NASDAQ:AAPL | Apple\nNASDAQ:MSFT | Microsoft")
          .setValue(this.state.symbolsText)
          .onChange((value) => {
            this.state.symbolsText = value;
            onChange();
          }))
        .addButton((button) => button
          .setButtonText("Lookup")
          .setTooltip("Search and append a TradingView symbol")
          .onClick(() => this.openSymbolLookup((result) => {
            const line = `${result.fullName} | ${result.description || result.symbol}`;
            this.state.symbolsText = appendLine(this.state.symbolsText, line);
            this.render();
          })));
    }

    if (hasSetting(definition, "interval")) {
      new Setting(sections.basicSection)
        .setName("Interval")
        .setDesc("Chart interval. D = daily, W = weekly, M = monthly.")
        .addDropdown((dropdown) => {
          for (const interval of INTERVALS) dropdown.addOption(interval, interval);
          decorateDropdown(dropdown.selectEl);
          dropdown
            .setValue(this.state.interval)
            .onChange((value) => {
              this.state.interval = value;
              onChange();
            });
        });
    }

    new Setting(sections.sizeSection)
      .setName("Theme")
      .setDesc("auto follows Obsidian's current light/dark theme.")
      .addDropdown((dropdown) => {
        for (const theme of THEMES) dropdown.addOption(theme, theme);
        decorateDropdown(dropdown.selectEl);
        dropdown
          .setValue(this.state.theme)
          .onChange((value) => {
            this.state.theme = value;
            onChange();
          });
      });

    new Setting(sections.sizeSection)
      .setName("Height (px)")
      .setDesc("Widget height in pixels. This is written as the block's height option.")
      .addText((text) => text
        .setPlaceholder(String(definition.defaultHeight))
        .setValue(this.state.height)
        .onChange((value) => {
          this.state.height = value.trim();
          onChange();
        }));

    new Setting(sections.sizeSection)
      .setName("Width")
      .setDesc("Widget width. Use 100% for full note width, or values like 600px, 80%, 50vw, 40rem.")
      .addText((text) => text
        .setPlaceholder("100%")
        .setValue(this.state.width)
        .onChange((value) => {
          this.state.width = value.trim();
          onChange();
        }));

    new Setting(sections.behaviorSection)
      .setName("Lazy load widget")
      .setDesc("Load this widget only when it approaches the viewport.")
      .addToggle((toggle) => toggle
        .setValue(this.state.lazyLoad)
        .onChange((value) => {
          this.state.lazyLoad = value;
          onChange();
        }));

    new Setting(sections.advancedSection)
      .setName("Locale")
      .setDesc("TradingView locale, e.g. en, es, de_DE.")
      .addText((text) => text
        .setPlaceholder(this.plugin.settings.defaultLocale)
        .setValue(this.state.locale)
        .onChange((value) => {
          this.state.locale = value.trim();
          onChange();
        }));

    if (hasSetting(definition, "timezone")) {
      new Setting(sections.advancedSection)
        .setName("Timezone")
        .setDesc("Used by chart widgets.")
        .addText((text) => text
          .setPlaceholder(this.plugin.settings.defaultTimezone)
          .setValue(this.state.timezone)
          .onChange((value) => {
            this.state.timezone = value.trim();
            onChange();
          }));
    }

    new Setting(sections.advancedSection)
      .setName("Show TradingView attribution")
      .setDesc("Adds the standard TradingView attribution line below the widget.")
      .addToggle((toggle) => toggle
        .setValue(this.state.showAttribution)
        .onChange((value) => {
          this.state.showAttribution = value;
          onChange();
        }));

    renderExtraOptionFields({ sections, definition, state: this.state, onChange });

    new Setting(sections.advancedSection)
      .setName("Advanced YAML options")
      .setDesc("Optional TradingView settings merged into the code block. Use this for widget-specific options not exposed above.")
      .addTextArea((textarea) => textarea
        .setPlaceholder("hide_side_toolbar: true\ncalendar: false")
        .setValue(this.state.advancedYaml)
        .onChange((value) => {
          this.state.advancedYaml = value;
          onChange();
        }));
  }

  private currentDefinition(): TradingViewWidgetDefinition {
    return getWidgetDefinition(this.state.widget) ?? WIDGETS[0];
  }

  private buildCodeBlock(): string {
    return buildTradingViewCodeBlock(this.state, this.currentDefinition(), this.plugin.settings);
  }

  private openSymbolLookup(onChoose: (result: TradingViewSymbolResult) => void): void {
    new SymbolLookupModal(this.app, onChoose).open();
  }

  private handleStateChanged(): void {
    this.contentEl.toggleClass("has-yaml-error", hasAdvancedYamlError(this.state.advancedYaml));
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

function appendLine(value: string, line: string): string {
  const trimmed = value.trimEnd();
  return trimmed ? `${trimmed}\n${line}` : line;
}
