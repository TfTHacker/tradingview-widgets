export function decorateDropdown(selectEl: HTMLSelectElement): void {
  const controlEl = selectEl.parentElement;
  if (!controlEl || controlEl.querySelector(".tradingview-widget-wizard-dropdown-chevron")) return;

  controlEl.addClass("tradingview-widget-wizard-dropdown-control");
  controlEl.createSpan({ cls: "tradingview-widget-wizard-dropdown-chevron", text: "▾" });
}
