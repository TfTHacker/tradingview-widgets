export type ObsidianTheme = "light" | "dark";

export function getObsidianTheme(): ObsidianTheme {
  return document.body.classList.contains("theme-dark") ? "dark" : "light";
}

export function startThemeObserver(options: {
  shouldRerender: () => boolean;
  onThemeChange: (theme: ObsidianTheme) => void;
  registerCleanup: (cleanup: () => void) => void;
}): MutationObserver {
  let observedTheme = getObsidianTheme();
  const observer = new MutationObserver(() => {
    const nextTheme = getObsidianTheme();
    if (nextTheme === observedTheme) return;

    observedTheme = nextTheme;
    if (options.shouldRerender()) options.onThemeChange(nextTheme);
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  options.registerCleanup(() => observer.disconnect());
  return observer;
}
