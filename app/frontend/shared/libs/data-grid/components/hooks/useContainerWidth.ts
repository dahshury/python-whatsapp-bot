import React from "react";

type UseContainerWidthOptions = {
  minDeltaPx?: number;
  throttleMs?: number;
};

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(
  options: UseContainerWidthOptions = {}
): [React.RefCallback<T>, number | undefined] {
  const { minDeltaPx = 2, throttleMs = 50 } = options;
  const elementRef = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  const lastWidthRef = React.useRef<number | undefined>(undefined);
  const rafIdRef = React.useRef<number | null>(null);
  const lastUpdateTsRef = React.useRef<number>(0);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  // Callback ref to measure immediately on mount
  const ref = React.useCallback((el: T | null) => {
    elementRef.current = el;
    if (el) {
      const w = Math.round(el.offsetWidth || 0);
      if (w > 0) {
        lastWidthRef.current = w;
        setWidth(w);
      }
    }
  }, []);

  React.useEffect(() => {
    const el = elementRef.current;
    if (!el) {
      return;
    }

    const update = (w: number) => {
      lastWidthRef.current = w;
      setWidth(w);
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let w = entry.contentRect.width;
        if (!Number.isFinite(w) || w <= 0) {
          continue;
        }
        w = Math.round(w);
        const prev = lastWidthRef.current ?? -1;
        if (Math.abs(w - prev) < minDeltaPx) {
          continue;
        }

        const now = performance.now();
        const doUpdate = () => update(w);

        if (now - lastUpdateTsRef.current >= throttleMs) {
          lastUpdateTsRef.current = now;
          doUpdate();
        } else {
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
          }
          rafIdRef.current = requestAnimationFrame(() => {
            lastUpdateTsRef.current = performance.now();
            doUpdate();
          });
        }
      }
    });

    resizeObserverRef.current = observer;
    observer.observe(el);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      try {
        resizeObserverRef.current?.disconnect();
      } catch {
        /* noop */
      }
      resizeObserverRef.current = null;
    };
  }, [minDeltaPx, throttleMs]);

  return [ref, width];
}
