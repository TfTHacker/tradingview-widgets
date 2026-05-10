import { parseTradingViewBlock } from "./parser";
import type { TradingViewPluginSettings } from "./settings";
import { getObsidianTheme } from "./theme";
import { supportedWidgetNames } from "./widgets";
import { LazyWidgetLoader } from "./lazyLoad";

export class TradingViewBlockRenderer {
  private renderedBlocks = new Set<HTMLElement>();

  constructor(
    private readonly getSettings: () => TradingViewPluginSettings,
    private readonly lazyLoader: LazyWidgetLoader,
  ) {}

  render(source: string, el: HTMLElement): void {
    this.lazyLoader.disconnect(el);
    el.empty();
    el.addClass("tradingview-widget-obsidian");
    this.renderedBlocks.add(el);
    el.dataset.tradingviewSource = source;

    try {
      const parsed = parseTradingViewBlock(source, this.getSettings(), getObsidianTheme());
      el.style.height = `${parsed.height}px`;
      el.style.width = parsed.width;
      el.toggleClass("is-compact-attribution", parsed.showAttribution);

      const outer = el.createDiv({ cls: "tradingview-widget-container" });
      outer.style.height = "100%";
      outer.style.width = "100%";
      outer.createDiv({ cls: "tradingview-widget-container__widget" });

      if (parsed.showAttribution) renderAttribution(outer);

      const placeholder = outer.createDiv({
        cls: "tradingview-widget-obsidian-placeholder",
        text: parsed.lazyLoad ? "TradingView widget will load when visible…" : "Loading TradingView widget…",
      });

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = parsed.definition.script;
      script.text = JSON.stringify(parsed.settings, null, 2);
      script.onerror = () => {
        placeholder.detach();
        this.renderError(el, `TradingView widget script failed to load: ${parsed.definition.script}`);
      };

      this.lazyLoader.schedule(el, outer, script, placeholder, parsed.lazyLoad);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.renderError(el, `${message}\n\nSupported widgets: ${supportedWidgetNames()}`);
    }
  }

  rerenderAll(): void {
    for (const el of Array.from(this.renderedBlocks)) {
      if (!el.isConnected) {
        this.renderedBlocks.delete(el);
        continue;
      }
      this.render(el.dataset.tradingviewSource ?? "", el);
    }
  }

  clear(): void {
    this.renderedBlocks.clear();
  }

  private renderError(el: HTMLElement, message: string): void {
    el.empty();
    el.removeClass("tradingview-widget-obsidian");
    el.createDiv({ cls: "tradingview-widget-obsidian-error", text: message });
  }
}

function renderAttribution(outer: HTMLElement): void {
  const copyright = outer.createDiv({ cls: "tradingview-widget-copyright" });
  const link = copyright.createEl("a", {
    text: "Track all markets on TradingView",
    href: "https://www.tradingview.com/",
  });
  link.setAttr("rel", "noopener nofollow");
  link.setAttr("target", "_blank");
}
