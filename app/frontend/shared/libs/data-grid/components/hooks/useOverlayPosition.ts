import React from "react";

export type OverlayPosition = {
  top: number;
  left: number;
};

type UseOverlayPositionOptions = {
  reanchorKey?: unknown;
};

const TOOLBAR_HEIGHT_ESTIMATE = 15; // matches ~h-10 styling of MenuBar
const TOOLBAR_VERTICAL_MARGIN = 8;
const TOOLBAR_HORIZONTAL_MARGIN = 8;
const CANVAS_POLL_INTERVAL_MS = 40;

export function useOverlayPosition<T extends HTMLElement = HTMLDivElement>(
  ref: React.RefObject<T | null>,
  options: UseOverlayPositionOptions = {}
): OverlayPosition | null {
  const [position, setPosition] = React.useState<OverlayPosition | null>(null);
  const { reanchorKey } = options;

  const compute = React.useCallback(() => {
    try {
      const el = ref.current;
      if (!el) {
        return;
      }

      const getRect = (node: HTMLElement | null): DOMRect | null => {
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return null;
        }
        return rect;
      };

      const canvas =
        (el.querySelector(
          '[data-testid="data-grid-canvas"]'
        ) as HTMLElement | null) ||
        (el.querySelector(
          'canvas[data-testid="data-grid-canvas"]'
        ) as HTMLElement | null) ||
        (el.querySelector("canvas") as HTMLElement | null);
      const canvasRect = getRect(canvas);

      const scroller = canvasRect
        ? null
        : (el.querySelector(".dvn-scroller") as HTMLElement | null);
      const scrollerRect = canvasRect ? null : getRect(scroller);

      const containerRect = el.getBoundingClientRect();
      const anchorRect = canvasRect || scrollerRect || containerRect;

      const top = Math.max(
        anchorRect.top - (TOOLBAR_HEIGHT_ESTIMATE + TOOLBAR_VERTICAL_MARGIN),
        TOOLBAR_VERTICAL_MARGIN
      );
      const left = Math.min(
        anchorRect.right - TOOLBAR_HORIZONTAL_MARGIN,
        typeof window !== "undefined"
          ? window.innerWidth - TOOLBAR_HORIZONTAL_MARGIN
          : anchorRect.right - TOOLBAR_HORIZONTAL_MARGIN
      );

      setPosition({ top, left });
    } catch {
      /* noop */
    }
  }, [ref]);

  React.useEffect(() => {
    let rafId: number | null = null;
    let cleanup: (() => void) | null = null;

    const setupForElement = (element: HTMLElement) => {
      const onScroll = () => compute();
      const onResize = () => compute();
      const shouldWatchFullscreenTargets = Boolean(reanchorKey);

      const scrollTargets: Array<EventTarget | null | undefined> = [
        typeof window !== "undefined" ? window : undefined,
        typeof document !== "undefined" ? document : undefined,
        element,
        shouldWatchFullscreenTargets && typeof document !== "undefined"
          ? document.getElementById("grid-fullscreen-portal")
          : undefined,
        shouldWatchFullscreenTargets && typeof document !== "undefined"
          ? (document.querySelector(
              ".glide-grid-fullscreen-container"
            ) as HTMLElement | null)
          : undefined,
      ];

      for (const target of scrollTargets) {
        try {
          if (target && "addEventListener" in target) {
            (target as unknown as Window).addEventListener("scroll", onScroll, {
              capture: true,
              passive: true,
            } as unknown as boolean);
          }
        } catch {
          /* noop */
        }
      }

      if (typeof window !== "undefined") {
        window.addEventListener("resize", onResize);
      }

      // Use requestAnimationFrame to prevent ResizeObserver loop errors
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          compute();
        });
      });

      // MutationObserver to watch for canvas element to appear
      const mo = new MutationObserver(() => {
        requestAnimationFrame(() => {
          compute();
        });
      });

      let pollInterval: ReturnType<typeof setInterval> | null = null;

      try {
        ro.observe(element);

        // Watch for DOM changes to catch when canvas is added
        mo.observe(element, {
          childList: true,
          subtree: true,
        });

        // Also observe the canvas element if it exists for more accurate updates
        const findCanvas = () =>
          (element.querySelector(
            '[data-testid="data-grid-canvas"]'
          ) as HTMLElement | null) ||
          (element.querySelector(
            'canvas[data-testid="data-grid-canvas"]'
          ) as HTMLElement | null) ||
          (element.querySelector("canvas") as HTMLElement | null);

        const canvas = findCanvas();
        if (canvas) {
          ro.observe(canvas);
        }

        // Poll for canvas if it doesn't exist yet (with timeout)
        let pollCount = 0;
        const maxPolls = 50; // ~2 seconds at 40ms intervals
        pollInterval = setInterval(() => {
          pollCount += 1;
          const foundCanvas = findCanvas();
          if (foundCanvas) {
            ro.observe(foundCanvas);
            compute();
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          } else if (pollCount >= maxPolls && pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }, CANVAS_POLL_INTERVAL_MS);
      } catch {
        /* noop */
      }

      // Initial computation now that listeners are attached
      compute();

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        for (const target of scrollTargets) {
          try {
            if (target && "removeEventListener" in target) {
              (target as unknown as Window).removeEventListener(
                "scroll",
                onScroll,
                true
              );
            }
          } catch {
            /* noop */
          }
        }
        if (typeof window !== "undefined") {
          window.removeEventListener("resize", onResize);
        }
        try {
          ro.disconnect();
          mo.disconnect();
        } catch {
          /* noop */
        }
      };
    };

    const ensureElement = () => {
      const element = ref.current;
      if (!element) {
        rafId = requestAnimationFrame(ensureElement);
        return;
      }
      cleanup = setupForElement(element);
    };

    ensureElement();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [compute, ref, reanchorKey]);

  return position;
}
