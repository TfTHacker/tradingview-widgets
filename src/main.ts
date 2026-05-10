import { Plugin } from "obsidian";
import { LazyWidgetLoader } from "./lazyLoad";
import { TradingViewBlockRenderer } from "./renderer";
import { DEFAULT_SETTINGS, type TradingViewPluginSettings } from "./settings";
import { TradingViewSettingTab } from "./settingsTab";
import { startThemeObserver } from "./theme";
import { TradingViewWizardModal } from "./wizard";

export default class TradingViewWidgetsPlugin extends Plugin {
  settings: TradingViewPluginSettings = { ...DEFAULT_SETTINGS };
  private lazyLoader = new LazyWidgetLoader();
  private renderer = new TradingViewBlockRenderer(() => this.settings, this.lazyLoader);
  private themeObserver: MutationObserver | null = null;

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("tradingview", (source, el) => {
      this.renderer.render(source, el);
    });

    this.addCommand({
      id: "open-tradingview-widget-wizard",
      name: "Widget Wizard",
      callback: () => {
        new TradingViewWizardModal(this.app, this).open();
      },
    });

    this.addSettingTab(new TradingViewSettingTab(this.app, this));
    this.themeObserver = startThemeObserver({
      shouldRerender: () => this.settings.rerenderOnThemeChange,
      onThemeChange: () => this.renderer.rerenderAll(),
      registerCleanup: (cleanup) => this.register(cleanup),
    });
  }

  onunload() {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.lazyLoader.disconnectAll();
    this.renderer.clear();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
