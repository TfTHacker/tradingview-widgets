import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { parseTradingViewBlock, type TradingViewDefaults } from "./parser";
import { supportedWidgetNames } from "./widgets";
import { TradingViewWizardModal } from "./wizard";

interface TradingViewPluginSettings extends TradingViewDefaults {
  rerenderOnThemeChange: boolean;
  lazyLoadWidgets: boolean;
}

const DEFAULT_SETTINGS: TradingViewPluginSettings = {
  defaultWidget: "advanced-chart",
  defaultHeight: 600,
  defaultLocale: "en",
  defaultTimezone: "Etc/UTC",
  showAttribution: false,
  rerenderOnThemeChange: true,
  lazyLoadWidgets: true,
};

export default class TradingViewWidgetsPlugin extends Plugin {
  settings: TradingViewPluginSettings = { ...DEFAULT_SETTINGS };
  private renderedBlocks = new Set<HTMLElement>();
  private lazyLoadObservers = new Map<HTMLElement, IntersectionObserver>();
  private themeObserver: MutationObserver | null = null;
  private observedTheme: "light" | "dark" = "light";

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("tradingview", (source, el) => {
      this.renderTradingViewBlock(source, el);
    });

    this.addCommand({
      id: "open-tradingview-widget-wizard",
      name: "Widget Wizard",
      callback: () => {
        new TradingViewWizardModal(this.app, this).open();
      },
    });

    this.addSettingTab(new TradingViewSettingTab(this.app, this));
    this.startThemeObserver();
  }

  onunload() {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    Array.from(this.lazyLoadObservers.values()).forEach((observer) => observer.disconnect());
    this.lazyLoadObservers.clear();
    this.renderedBlocks.clear();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private renderTradingViewBlock(source: string, el: HTMLElement): void {
    this.disconnectLazyLoadObserver(el);
    el.empty();
    el.addClass("tradingview-widget-obsidian");
    this.renderedBlocks.add(el);
    el.dataset.tradingviewSource = source;

    try {
      const parsed = parseTradingViewBlock(source, this.settings, this.getObsidianTheme());
      el.style.height = `${parsed.height}px`;
      el.style.width = parsed.width;
      el.toggleClass("is-compact-attribution", parsed.showAttribution);

      const outer = el.createDiv({ cls: "tradingview-widget-container" });
      outer.style.height = "100%";
      outer.style.width = "100%";
      outer.createDiv({ cls: "tradingview-widget-container__widget" });

      if (parsed.showAttribution) {
        const copyright = outer.createDiv({ cls: "tradingview-widget-copyright" });
        const link = copyright.createEl("a", {
          text: "Track all markets on TradingView",
          href: "https://www.tradingview.com/",
        });
        link.setAttr("rel", "noopener nofollow");
        link.setAttr("target", "_blank");
      }

      const placeholder = outer.createDiv({ cls: "tradingview-widget-obsidian-placeholder", text: parsed.lazyLoad ? "TradingView widget will load when visible…" : "Loading TradingView widget…" });

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = parsed.definition.script;
      script.text = JSON.stringify(parsed.settings, null, 2);
      script.onerror = () => {
        placeholder.detach();
        this.renderError(el, `TradingView widget script failed to load: ${parsed.definition.script}`);
      };
      this.scheduleWidgetLoad(el, outer, script, placeholder, parsed.lazyLoad);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.renderError(el, `${message}\n\nSupported widgets: ${supportedWidgetNames()}`);
    }
  }

  private scheduleWidgetLoad(el: HTMLElement, outer: HTMLElement, script: HTMLScriptElement, placeholder: HTMLElement, lazyLoad: boolean): void {
    const load = () => {
      this.disconnectLazyLoadObserver(el);
      if (!el.isConnected || script.isConnected) return;

      placeholder.setText("Loading TradingView widget…");
      window.setTimeout(() => placeholder.detach(), 4000);
      outer.appendChild(script);
    };

    if (!lazyLoad || !("IntersectionObserver" in window)) {
      load();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) load();
    }, {
      root: null,
      rootMargin: "400px 0px",
      threshold: 0.01,
    });

    this.lazyLoadObservers.set(el, observer);
    observer.observe(el);
  }

  private disconnectLazyLoadObserver(el: HTMLElement): void {
    const observer = this.lazyLoadObservers.get(el);
    if (!observer) return;
    observer.disconnect();
    this.lazyLoadObservers.delete(el);
  }

  private renderError(el: HTMLElement, message: string): void {
    el.empty();
    el.removeClass("tradingview-widget-obsidian");
    el.createDiv({ cls: "tradingview-widget-obsidian-error", text: message });
  }

  private getObsidianTheme(): "light" | "dark" {
    return document.body.classList.contains("theme-dark") ? "dark" : "light";
  }

  private startThemeObserver(): void {
    this.themeObserver?.disconnect();
    this.observedTheme = this.getObsidianTheme();
    this.themeObserver = new MutationObserver(() => {
      const nextTheme = this.getObsidianTheme();
      if (nextTheme === this.observedTheme) return;

      this.observedTheme = nextTheme;
      if (this.settings.rerenderOnThemeChange) this.rerenderAllBlocks();
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    this.register(() => this.themeObserver?.disconnect());
  }

  private rerenderAllBlocks(): void {
    for (const el of Array.from(this.renderedBlocks)) {
      if (!el.isConnected) {
        this.renderedBlocks.delete(el);
        continue;
      }
      this.renderTradingViewBlock(el.dataset.tradingviewSource ?? "", el);
    }
  }
}

class TradingViewSettingTab extends PluginSettingTab {
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
