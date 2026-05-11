import type { MarkdownPostProcessorContext } from "obsidian";
import { parseTradingViewBlock } from "./parser";
import type { TradingViewPluginSettings } from "./settings";
import { getObsidianTheme } from "./theme";
import { supportedWidgetNames } from "./widgets";
import { LazyWidgetLoader } from "./lazyLoad";
import type { WizardEditTarget } from "./wizard/editTarget";

export interface TradingViewEditRequest {
  source: string;
  editTarget: WizardEditTarget;
}

export class TradingViewBlockRenderer {
  private renderedBlocks = new Set<HTMLElement>();
  private contexts = new WeakMap<HTMLElement, MarkdownPostProcessorContext>();

  constructor(
    private readonly getSettings: () => TradingViewPluginSettings,
    private readonly lazyLoader: LazyWidgetLoader,
    private readonly onEdit?: (request: TradingViewEditRequest) => void,
  ) {}

  render(source: string, el: HTMLElement, ctx?: MarkdownPostProcessorContext): void {
    this.lazyLoader.disconnect(el);
    el.empty();
    el.addClass("tradingview-widget-obsidian");
    this.renderedBlocks.add(el);
    if (ctx) this.contexts.set(el, ctx);
    const renderContext = ctx ?? this.contexts.get(el);
    el.dataset.tradingviewSource = source;

    try {
      const parsed = parseTradingViewBlock(source, this.getSettings(), getObsidianTheme());
      el.style.height = `${parsed.height}px`;
      el.style.width = parsed.width;
      el.toggleClass("is-compact-attribution", parsed.showAttribution);

      const outer = el.createDiv({ cls: "tradingview-widget-container" });
      outer.style.height = "100%";
      outer.style.width = "100%";
      this.renderEditButton(source, outer, el, renderContext);
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

  private renderEditButton(source: string, outer: HTMLElement, el: HTMLElement, ctx?: MarkdownPostProcessorContext): void {
    if (!this.onEdit || !ctx?.sourcePath) return;
    const button = outer.createEl("button", {
      cls: "tradingview-widget-edit-button",
      attr: {
        type: "button",
        "aria-label": "Edit TradingView widget",
        title: "Edit widget settings",
      },
    });
    button.createSpan({ cls: "tradingview-widget-edit-button-icon", text: "⚙" });
    button.createSpan({ cls: "tradingview-widget-edit-button-text", text: "Edit" });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const section = ctx.getSectionInfo(el);
      if (!section) return;
      this.onEdit?.({
        source,
        editTarget: {
          sourcePath: ctx.sourcePath,
          lineStart: section.lineStart,
          lineEnd: section.lineEnd,
          sectionText: section.text,
        },
      });
    });
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
