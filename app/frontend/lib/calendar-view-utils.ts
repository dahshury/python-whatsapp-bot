import { useCallback } from "react";

export function calculateCalendarHeight(currentView: string): number | "auto" {
  // Views that should naturally expand and let the page scroll
  if (currentView === "multiMonthYear" || currentView === "listMonth") {
    return "auto";
  }

  // Viewport-based heights for grid views
  try {
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
    const headerHeight = 64; // top header
    const containerPadding = 32; // p-4 top+bottom in page wrapper
    const available = Math.max(viewportHeight - headerHeight - containerPadding, 600);

    if (currentView?.includes("timeGrid")) return available; // week/day time grid
    if (currentView?.includes("dayGrid")) return available;  // month grid
  } catch {
    // SSR or no window - fall back to sane defaults
    if (currentView?.includes("timeGrid")) return 720;
    if (currentView?.includes("dayGrid")) return 650;
  }

  return 640;
}

export function useCalendarResize(
  currentView: string,
  onHeightChange?: () => void,
) {
  const calculateHeight = useCallback(() => {
    if (onHeightChange) onHeightChange();
    return calculateCalendarHeight(currentView);
  }, [currentView, onHeightChange]);

  return { calculateHeight };
}


