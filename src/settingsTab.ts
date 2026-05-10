import { App, PluginSettingTab, Setting } from "obsidian";
import type TradingViewWidgetsPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";
import { supportedWidgetNames } from "./widgets";

export class TradingViewSettingTab extends PluginSettingTab {
  plugin: TradingViewWidgetsPlugin;

  constructor(app: App, plugin: TradingViewWidgetsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "TradingView Widgets" });

    new Setting(containerEl)
      .setName("Default widget")
      .setDesc("Used when a tradingview block omits widget/type.")
      .addText((text) => text
        .setPlaceholder("advanced-chart")
        .setValue(this.plugin.settings.defaultWidget)
        .onChange(async (value) => {
          this.plugin.settings.defaultWidget = value.trim() || DEFAULT_SETTINGS.defaultWidget;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Default height")
      .setDesc("Height in pixels when a block omits height.")
      .addText((text) => text
        .setPlaceholder("600")
        .setValue(String(this.plugin.settings.defaultHeight))
        .onChange(async (value) => {
          const parsed = Number(value);
          this.plugin.settings.defaultHeight = Number.isFinite(parsed) ? Math.max(80, Math.min(2000, Math.round(parsed))) : DEFAULT_SETTINGS.defaultHeight;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Default locale")
      .setDesc("TradingView locale, for example en, es, de_DE.")
      .addText((text) => text
        .setPlaceholder("en")
        .setValue(this.plugin.settings.defaultLocale)
        .onChange(async (value) => {
          this.plugin.settings.defaultLocale = value.trim() || DEFAULT_SETTINGS.defaultLocale;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Default timezone")
      .setDesc("Used mainly by the Advanced Chart widget.")
      .addText((text) => text
        .setPlaceholder("Etc/UTC")
        .setValue(this.plugin.settings.defaultTimezone)
        .onChange(async (value) => {
          this.plugin.settings.defaultTimezone = value.trim() || DEFAULT_SETTINGS.defaultTimezone;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Show TradingView attribution")
      .setDesc("Can be overridden per block with showAttribution: true.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showAttribution)
        .onChange(async (value) => {
          this.plugin.settings.showAttribution = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Re-render on theme change")
      .setDesc("Keeps theme: auto blocks in sync with Obsidian light/dark mode.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.rerenderOnThemeChange)
        .onChange(async (value) => {
          this.plugin.settings.rerenderOnThemeChange = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Lazy load widgets")
      .setDesc("Load TradingView widgets only when they approach the viewport. Improves note load time and reduces offscreen iframe work.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.lazyLoadWidgets)
        .onChange(async (value) => {
          this.plugin.settings.lazyLoadWidgets = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Supported widgets")
      .setDesc(supportedWidgetNames());
  }
}
