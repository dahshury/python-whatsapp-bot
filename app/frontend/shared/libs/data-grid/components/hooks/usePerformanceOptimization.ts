import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEBOUNCE_TIME_MS,
  LARGE_TABLE_ROWS_THRESHOLD,
  PerformanceMode,
} from "../core/types";

type PerformanceMetrics = {
  renderTime: number;
  memoryUsage: number;
  frameRate: number;
  mode: PerformanceMode;
};

// Type definition for Chrome's performance.memory API
type ChromePerformanceMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

interface ChromePerformance extends Performance {
  memory: ChromePerformanceMemory;
}

const OPTIMIZED_THRESHOLD_DIVISOR = 3;
const FRAME_BUFFER_SIZE = 60;
const MS_PER_SECOND = 1000;
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * KB_PER_MB;
const MEMORY_CHECK_INTERVAL_MS = 1000;
const MEMORY_USAGE_THRESHOLD = 0.8;
const MEMORY_CHECK_INTERVAL_SECONDS = 5000;

export function usePerformanceOptimization(rowCount: number) {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(
    PerformanceMode.NORMAL
  );
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    mode: PerformanceMode.NORMAL,
  });

  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTime = useRef<number>(performance.now());

  const updatePerformanceMode = useCallback(() => {
    if (rowCount >= LARGE_TABLE_ROWS_THRESHOLD) {
      setPerformanceMode(PerformanceMode.HIGH_PERFORMANCE);
    } else if (
      rowCount >=
      LARGE_TABLE_ROWS_THRESHOLD / OPTIMIZED_THRESHOLD_DIVISOR
    ) {
      setPerformanceMode(PerformanceMode.OPTIMIZED);
    } else {
      setPerformanceMode(PerformanceMode.NORMAL);
    }
  }, [rowCount]);

  const measureFrameRate = useCallback(() => {
    const now = performance.now();
    const frameTime = now - lastFrameTime.current;

    frameTimeRef.current.push(frameTime);
    if (frameTimeRef.current.length > FRAME_BUFFER_SIZE) {
      frameTimeRef.current.shift();
    }

    const avgFrameTime =
      frameTimeRef.current.reduce((a, b) => a + b, 0) /
      frameTimeRef.current.length;
    const fps = MS_PER_SECOND / avgFrameTime;

    setMetrics((prev) => ({ ...prev, frameRate: Math.round(fps) }));
    lastFrameTime.current = now;

    requestAnimationFrame(measureFrameRate);
  }, []);

  const measureMemoryUsage = useCallback(() => {
    if ("memory" in performance) {
      const memory = (performance as ChromePerformance).memory;
      setMetrics((prev) => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / BYTES_PER_MB,
      }));
    }
  }, []);

  useEffect(() => {
    updatePerformanceMode();
  }, [updatePerformanceMode]);

  useEffect(() => {
    const rafId = requestAnimationFrame(measureFrameRate);
    const memoryInterval = setInterval(
      measureMemoryUsage,
      MEMORY_CHECK_INTERVAL_MS
    );

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(memoryInterval);
    };
  }, [measureFrameRate, measureMemoryUsage]);

  const shouldUseVirtualization = useMemo(
    () => performanceMode !== PerformanceMode.NORMAL,
    [performanceMode]
  );

  const shouldDebounceUpdates = useMemo(
    () => performanceMode === PerformanceMode.HIGH_PERFORMANCE,
    [performanceMode]
  );

  const optimizedDebounceTime = useMemo(() => {
    switch (performanceMode) {
      case PerformanceMode.HIGH_PERFORMANCE:
        return DEBOUNCE_TIME_MS * 2;
      case PerformanceMode.OPTIMIZED:
        return DEBOUNCE_TIME_MS;
      default:
        return DEBOUNCE_TIME_MS / 2;
    }
  }, [performanceMode]);

  return {
    performanceMode,
    metrics,
    shouldUseVirtualization,
    shouldDebounceUpdates,
    optimizedDebounceTime,
  };
}

export function useMemoryManager() {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    limit: number;
  }>({ used: 0, total: 0, limit: 0 });

  const cleanupCallbacks = useRef<(() => void)[]>([]);

  const registerCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback);
    return () => {
      const index = cleanupCallbacks.current.indexOf(callback);
      if (index > -1) {
        cleanupCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const forceCleanup = useCallback(() => {
    for (const callback of cleanupCallbacks.current) {
      try {
        callback();
      } catch (_error) {
        // Cleanup callback failed; continue
      }
    }

    if (global.gc) {
      global.gc();
    }
  }, []);

  const checkMemoryUsage = useCallback(() => {
    if ("memory" in performance) {
      const memory = (performance as ChromePerformance).memory;
      setMemoryUsage({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });

      const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (usagePercent > MEMORY_USAGE_THRESHOLD) {
        forceCleanup();
      }
    }
  }, [forceCleanup]);

  useEffect(() => {
    const interval = setInterval(
      checkMemoryUsage,
      MEMORY_CHECK_INTERVAL_SECONDS
    );
    return () => clearInterval(interval);
  }, [checkMemoryUsage]);

  return {
    memoryUsage,
    registerCleanup,
    forceCleanup,
  };
}
