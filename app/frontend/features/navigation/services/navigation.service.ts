import type { NavigationUseCase } from "../usecase/navigation.usecase";

export const NavigationService = (): NavigationUseCase => {
  let currentView = "month";
  return {
    setView: (view: string) => {
      currentView = view;
      try {
        window.dispatchEvent(new CustomEvent("nav:view", { detail: { view } }));
      } catch {
        // Silently ignore errors in event dispatch (e.g., no listeners or context issues)
      }
    },
    getView: () => currentView,
  };
};
