"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/ui/resizable";

type ResizableSplitPaneProps = {
  top: ReactNode;
  bottom: ReactNode;
  className?: string;
  defaultTopHeight?: number | string | null;
  minTopHeight?: number;
  maxTopHeight?: number;
  minBottomHeight?: number;
  locked?: boolean;
  onHeightChange?: (heightPercent: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const MIN_PERCENT_FALLBACK = 5;
const MAX_PERCENT_FALLBACK = 95;
const PERCENTAGE_SCALE = 100;
const DEFAULT_TOP_PERCENT = 30;

/**
 * A vertical resizable split pane component built on top of
 * react-resizable-panels with shadcn-ui styling.
 */
export function ResizableSplitPane({
  top,
  bottom,
  className,
  defaultTopHeight = "30%",
  minTopHeight = 100,
  maxTopHeight,
  minBottomHeight = 100,
  locked = false,
  onHeightChange,
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Only render ResizablePanelGroup after mount to avoid hydration mismatch
  // react-resizable-panels generates IDs and styles on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setContainerHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const toPercent = useCallback(
    (value?: number | string | null): number | undefined => {
      if (value === null || value === undefined) {
        return;
      }

      const convertNumber = (num: number) => {
        if (!Number.isFinite(num) || num <= 0) {
          return;
        }
        if (num <= 1) {
          return num * PERCENTAGE_SCALE;
        }
        if (num <= PERCENTAGE_SCALE) {
          return num;
        }
        if (containerHeight > 0) {
          return (num / containerHeight) * PERCENTAGE_SCALE;
        }
        return;
      };

      if (typeof value === "number") {
        return convertNumber(value);
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          return;
        }
        if (trimmed.endsWith("%")) {
          const parsed = Number.parseFloat(trimmed.replace("%", ""));
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        const parsed = Number.parseFloat(trimmed);
        return convertNumber(parsed);
      }

      return;
    },
    [containerHeight]
  );

  const minTopPercent = useMemo(() => {
    const converted = toPercent(minTopHeight);
    return converted !== undefined
      ? clamp(converted, MIN_PERCENT_FALLBACK, MAX_PERCENT_FALLBACK)
      : undefined;
  }, [minTopHeight, toPercent]);

  const maxTopPercent = useMemo(() => {
    const converted = toPercent(maxTopHeight);
    return converted !== undefined
      ? clamp(converted, MIN_PERCENT_FALLBACK, MAX_PERCENT_FALLBACK)
      : undefined;
  }, [maxTopHeight, toPercent]);

  const minBottomPercent = useMemo(() => {
    const converted = toPercent(minBottomHeight);
    return converted !== undefined
      ? clamp(converted, MIN_PERCENT_FALLBACK, MAX_PERCENT_FALLBACK)
      : undefined;
  }, [minBottomHeight, toPercent]);

  const resolvedDefaultPercent = useMemo(() => {
    const target = toPercent(defaultTopHeight);
    const minAllowed = minTopPercent ?? MIN_PERCENT_FALLBACK;
    const maxAllowed =
      maxTopPercent ??
      PERCENTAGE_SCALE - (minBottomPercent ?? MIN_PERCENT_FALLBACK);

    return clamp(
      target !== undefined ? target : DEFAULT_TOP_PERCENT,
      minAllowed,
      Math.max(minAllowed, maxAllowed)
    );
  }, [
    defaultTopHeight,
    minBottomPercent,
    minTopPercent,
    maxTopPercent,
    toPercent,
  ]);

  const defaultLayout = useMemo(() => {
    let topPercent = resolvedDefaultPercent;
    const bottomPercent = PERCENTAGE_SCALE - topPercent;

    if (minBottomPercent !== undefined && bottomPercent < minBottomPercent) {
      topPercent = clamp(
        PERCENTAGE_SCALE - minBottomPercent,
        minTopPercent ?? MIN_PERCENT_FALLBACK,
        maxTopPercent ?? MAX_PERCENT_FALLBACK
      );
    }

    return [topPercent, PERCENTAGE_SCALE - topPercent];
  }, [resolvedDefaultPercent, minBottomPercent, minTopPercent, maxTopPercent]);

  const handleLayoutChange = useCallback(
    (sizes: number[]) => {
      if (!locked && sizes[0] !== undefined) {
        onHeightChange?.(sizes[0]);
      }
    },
    [locked, onHeightChange]
  );

  // Handle drag state changes from ResizableHandle
  const handleDragging = useCallback((isDragging: boolean) => {
    setIsResizing(isDragging);
  }, []);

  const topMinSize = minTopPercent ?? MIN_PERCENT_FALLBACK;
  const bottomMinSize = minBottomPercent ?? MIN_PERCENT_FALLBACK;
  const topMaxSize =
    maxTopPercent !== undefined
      ? maxTopPercent
      : PERCENTAGE_SCALE - bottomMinSize;

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      data-resizing={isResizing ? "true" : undefined}
      ref={containerRef}
    >
      {isMounted ? (
        <ResizablePanelGroup
          className="flex min-h-0 flex-1 flex-col"
          direction="vertical"
          onLayout={handleLayoutChange}
        >
          <ResizablePanel
            className="min-h-0"
            defaultSize={defaultLayout[0]}
            maxSize={Math.max(topMinSize, topMaxSize)}
            minSize={topMinSize}
          >
            <div className="h-full w-full">{top}</div>
          </ResizablePanel>
          <ResizableHandle
            className={locked ? "hidden" : ""}
            disabled={locked}
            onDragging={handleDragging}
            withHandle
          />
          <ResizablePanel
            className="min-h-0"
            defaultSize={defaultLayout[1]}
            minSize={bottomMinSize}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {bottom}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // Fallback during SSR - render empty structure to avoid hydration mismatch
        // Children contain dynamic imports that render differently on server/client
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="h-full w-full" suppressHydrationWarning>
            {top}
          </div>
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            suppressHydrationWarning
          >
            {bottom}
          </div>
        </div>
      )}
    </div>
  );
}
