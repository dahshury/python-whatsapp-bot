import { useCallback, useEffect, useMemo, useState } from "react";

type CalendarHeight = number | "auto";

type UseCalendarHeightOptions = {
  headerHeight?: number;
  containerPadding?: number;
  footerSpace?: number;
  minHeight?: number;
};

const DEFAULTS: Required<UseCalendarHeightOptions> = {
  headerHeight: 64,
  containerPadding: 8,
  footerSpace: 4,
  minHeight: 600,
};

const DEFAULT_VIEWPORT_FALLBACK = 800;
const INITIAL_HEIGHT = 800;

export function useCalendarHeight(
  viewType: string,
  options?: UseCalendarHeightOptions
): { height: CalendarHeight; recalc: () => void } {
  const cfg = useMemo(() => ({ ...DEFAULTS, ...(options || {}) }), [options]);

  const calculate = useCallback((): CalendarHeight => {
    const viewportHeight =
      typeof window !== "undefined"
        ? window.innerHeight
        : DEFAULT_VIEWPORT_FALLBACK;
    const availableHeight =
      viewportHeight -
      cfg.headerHeight -
      cfg.containerPadding -
      cfg.footerSpace;
    if (viewType === "listMonth" || viewType === "multiMonthYear") {
      return "auto";
    }
    return Math.max(availableHeight, cfg.minHeight);
  }, [
    cfg.containerPadding,
    cfg.footerSpace,
    cfg.headerHeight,
    cfg.minHeight,
    viewType,
  ]);

  const [height, setHeight] = useState<CalendarHeight>(INITIAL_HEIGHT);

  const recalc = useCallback(() => {
    setHeight(calculate());
  }, [calculate]);

  useEffect(() => {
    recalc();
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalc]);

  // Recalculate when view type changes
  useEffect(() => {
    recalc();
  }, [recalc]);

  return { height, recalc };
}
