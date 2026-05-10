export interface WizardSections {
  basicSection: HTMLElement;
  sizeSection: HTMLElement;
  behaviorSection: HTMLElement;
  appearanceSection: HTMLElement;
  advancedSection: HTMLElement;
}

export function createWizardSections(containerEl: HTMLElement): WizardSections {
  return {
    basicSection: createStaticWizardSection(containerEl, "Basic setup", "Choose the widget and primary TradingView symbol settings."),
    sizeSection: createStaticWizardSection(containerEl, "Size & theme", "Control the widget dimensions and visual theme."),
    behaviorSection: createCollapsibleWizardSection(containerEl, "Behavior", "Common runtime behavior options.", false),
    appearanceSection: createCollapsibleWizardSection(containerEl, "Appearance", "Widget-specific visual display options.", false),
    advancedSection: createCollapsibleWizardSection(containerEl, "Advanced", "Locale, timezone, raw YAML, and lower-level TradingView settings.", false),
  };
}

function createStaticWizardSection(containerEl: HTMLElement, title: string, description: string): HTMLElement {
  const section = containerEl.createDiv({ cls: "tradingview-widget-wizard-section tradingview-widget-wizard-section-static" });
  const header = section.createDiv({ cls: "tradingview-widget-wizard-section-summary tradingview-widget-wizard-section-summary-static" });
  const titleWrap = header.createSpan({ cls: "tradingview-widget-wizard-section-title-wrap" });
  titleWrap.createEl("span", { cls: "tradingview-widget-wizard-section-title", text: title });
  titleWrap.createEl("span", { cls: "tradingview-widget-wizard-section-static-badge", text: "Always shown" });
  header.createEl("span", { cls: "tradingview-widget-wizard-section-desc", text: description });

  return section.createDiv({ cls: "tradingview-widget-wizard-section-body" });
}

function createCollapsibleWizardSection(containerEl: HTMLElement, title: string, description: string, open = true): HTMLElement {
  const section = containerEl.createEl("details", { cls: "tradingview-widget-wizard-section tradingview-widget-wizard-section-collapsible" });
  if (open) section.setAttr("open", "true");

  const summary = section.createEl("summary", { cls: "tradingview-widget-wizard-section-summary" });
  const titleWrap = summary.createSpan({ cls: "tradingview-widget-wizard-section-title-wrap" });
  titleWrap.createSpan({ cls: "tradingview-widget-wizard-section-chevron", text: "▸" });
  titleWrap.createEl("span", { cls: "tradingview-widget-wizard-section-title", text: title });
  summary.createEl("span", { cls: "tradingview-widget-wizard-section-desc", text: description });

  return section.createDiv({ cls: "tradingview-widget-wizard-section-body" });
}
