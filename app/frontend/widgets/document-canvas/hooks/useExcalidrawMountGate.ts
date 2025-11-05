"use client";

import type { MutableRefObject, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { logger } from "@/shared/libs/logger";

const logMountGateWarning = (context: string, error: unknown) => {
  logger.warn(`[useExcalidrawMountGate] ${context}`, error);
};

export type UseExcalidrawMountGateParams = {
  minWidth?: number;
  minHeight?: number;
};

export type UseExcalidrawMountGateResult = {
  containerRef: RefObject<HTMLDivElement | null>;
  mountReady: boolean;
  isMountedRef: MutableRefObject<boolean>;
};

export function useExcalidrawMountGate(
  params: UseExcalidrawMountGateParams = {}
): UseExcalidrawMountGateResult {
  const { minWidth = 2, minHeight = 2 } = params;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mountReady, setMountReady] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const isSizeReady = () => {
      const rect = element.getBoundingClientRect?.();
      return Boolean(rect && rect.width > minWidth && rect.height > minHeight);
    };

    if (isSizeReady()) {
      if (isMountedRef.current) {
        setMountReady(true);
      }
      return;
    }

    let resolved = false;
    const observer = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        try {
          const target = entries[0]?.target as HTMLElement | undefined;
          const rect = target?.getBoundingClientRect?.();
          if (
            !resolved &&
            rect &&
            rect.width > minWidth &&
            rect.height > minHeight
          ) {
            resolved = true;
            if (isMountedRef.current) {
              setMountReady(true);
            }
            try {
              observer.disconnect();
            } catch (error) {
              logMountGateWarning(
                "Disconnecting ResizeObserver after mount readiness failed",
                error
              );
            }
          }
        } catch (error) {
          logMountGateWarning(
            "Processing ResizeObserver entry for mount readiness failed",
            error
          );
        }
      });
    });

    try {
      observer.observe(element);
    } catch (error) {
      logMountGateWarning(
        "Observing document canvas container for resize events failed",
        error
      );
    }

    return () => {
      try {
        observer.disconnect();
      } catch (error) {
        logMountGateWarning(
          "Disconnecting ResizeObserver during cleanup failed",
          error
        );
      }
    };
  }, [minHeight, minWidth]);

  return {
    containerRef,
    mountReady,
    isMountedRef,
  } as const;
}
