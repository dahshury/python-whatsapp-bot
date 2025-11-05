import type { SettingsUseCase } from "../usecase/settings.usecase";

export const SettingsService = (): SettingsUseCase => {
  let theme: "light" | "dark" = "light";
  return {
    getTheme: () => theme,
    setTheme: (t) => {
      theme = t;
      try {
        window.dispatchEvent(
          new CustomEvent("settings:theme", { detail: { theme: t } })
        );
      } catch {
        // Silently ignore errors when dispatching theme change event (window may be unavailable)
      }
    },
  };
};
