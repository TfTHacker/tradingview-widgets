import { Setting } from "obsidian";
import { stringify as stringifyYaml } from "yaml";
import type { TradingViewWidgetDefinition } from "../widgets";
import { coerceLikeDefault, ensureChoice, getOptionSection, humanizeOptionName, isSimpleOptionValue, OPTION_CHOICES } from "./optionMetadata";
import type { WizardSections } from "./sections";
import { getExtraOptionKeys, type WizardState } from "./state";
import { decorateDropdown } from "./uiDecorators";

export function renderExtraOptionFields(args: {
  sections: WizardSections;
  definition: TradingViewWidgetDefinition;
  state: WizardState;
  onChange: () => void;
}): void {
  const { sections, definition, state, onChange } = args;
  const keys = getExtraOptionKeys(definition);
  if (!keys.length) return;

  for (const key of keys.filter((key) => getOptionSection(key) === "appearance")) {
    renderExtraOptionField(sections.appearanceSection, definition, state, key, onChange);
  }
  for (const key of keys.filter((key) => getOptionSection(key) === "behavior")) {
    renderExtraOptionField(sections.behaviorSection, definition, state, key, onChange);
  }
  for (const key of keys.filter((key) => getOptionSection(key) === "advanced")) {
    renderExtraOptionField(sections.advancedSection, definition, state, key, onChange);
  }
}

function renderExtraOptionField(containerEl: HTMLElement, definition: TradingViewWidgetDefinition, state: WizardState, key: string, onChange: () => void): void {
  const defaultValue = definition.defaultSettings[key];
  const label = humanizeOptionName(key);
  const setting = new Setting(containerEl)
    .setName(label)
    .setDesc(`TradingView option: ${key}`);

  if (typeof defaultValue === "boolean") {
    setting.addToggle((toggle) => toggle
      .setValue(Boolean(state.extraOptions[key]))
      .onChange((value) => {
        state.extraOptions[key] = value;
        onChange();
      }));
    return;
  }

  if (typeof defaultValue === "string" && OPTION_CHOICES[key]) {
    setting.addDropdown((dropdown) => {
      for (const option of ensureChoice(String(state.extraOptions[key] ?? defaultValue), OPTION_CHOICES[key])) {
        dropdown.addOption(option, option);
      }
      decorateDropdown(dropdown.selectEl);
      dropdown
        .setValue(String(state.extraOptions[key] ?? defaultValue))
        .onChange((value) => {
          state.extraOptions[key] = value;
          onChange();
        });
    });
    return;
  }

  if (typeof defaultValue === "number" || typeof defaultValue === "string") {
    setting.addText((text) => text
      .setPlaceholder(String(defaultValue))
      .setValue(String(state.extraOptions[key] ?? ""))
      .onChange((value) => {
        state.extraOptions[key] = coerceLikeDefault(value.trim(), defaultValue);
        onChange();
      }));
    return;
  }

  setting.addTextArea((textarea) => textarea
    .setPlaceholder(stringifyYaml(defaultValue).trimEnd())
    .setValue(state.extraOptionText[key] ?? stringifyYaml(defaultValue).trimEnd())
    .onChange((value) => {
      state.extraOptionText[key] = value;
      onChange();
    }));
}

export { isSimpleOptionValue };
