import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DEBOUNCE_TIME_MS,
	LARGE_TABLE_ROWS_THRESHOLD,
	PERFORMANCE_MODE,
	type PerformanceMode,
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

// Performance optimization constants
const KB_BYTES = 1024;
const MB_DIVISOR = KB_BYTES * KB_BYTES;
const FPS_DIVISOR = 1000;
const FRAME_RATE_MEASUREMENT_INTERVAL_MS = 1000;
const FRAME_TIME_WINDOW = 60;
const MEMORY_CHECK_INTERVAL_MS = 5000;
const MEMORY_THRESHOLD_PERCENT = 0.8;
const MEDIUM_ROW_THRESHOLD_DIVISOR = 3;

export function usePerformanceOptimization(rowCount: number) {
	const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(
		PERFORMANCE_MODE.NORMAL
	);
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		renderTime: 0,
		memoryUsage: 0,
		frameRate: 60,
		mode: PERFORMANCE_MODE.NORMAL,
	});

	const frameTimeRef = useRef<number[]>([]);
	const lastFrameTime = useRef<number>(performance.now());

	const updatePerformanceMode = useCallback(() => {
		if (rowCount >= LARGE_TABLE_ROWS_THRESHOLD) {
			setPerformanceMode(PERFORMANCE_MODE.HIGH_PERFORMANCE);
		} else if (
			rowCount >=
			LARGE_TABLE_ROWS_THRESHOLD / MEDIUM_ROW_THRESHOLD_DIVISOR
		) {
			setPerformanceMode(PERFORMANCE_MODE.OPTIMIZED);
		} else {
			setPerformanceMode(PERFORMANCE_MODE.NORMAL);
		}
	}, [rowCount]);

	const measureFrameRate = useCallback(() => {
		const now = performance.now();
		const frameTime = now - lastFrameTime.current;

		frameTimeRef.current.push(frameTime);
		if (frameTimeRef.current.length > FRAME_TIME_WINDOW) {
			frameTimeRef.current.shift();
		}

		const avgFrameTime =
			frameTimeRef.current.reduce((a, b) => a + b, 0) /
			frameTimeRef.current.length;
		const fps = FPS_DIVISOR / avgFrameTime;

		setMetrics((prev) => ({ ...prev, frameRate: Math.round(fps) }));
		lastFrameTime.current = now;

		requestAnimationFrame(measureFrameRate);
	}, []);

	const measureMemoryUsage = useCallback(() => {
		if ("memory" in performance) {
			const memory = (performance as ChromePerformance).memory;
			setMetrics((prev) => ({
				...prev,
				memoryUsage: memory.usedJSHeapSize / MB_DIVISOR,
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
			FRAME_RATE_MEASUREMENT_INTERVAL_MS
		);

		return () => {
			cancelAnimationFrame(rafId);
			clearInterval(memoryInterval);
		};
	}, [measureFrameRate, measureMemoryUsage]);

	const shouldUseVirtualization = useMemo(
		() => performanceMode !== PERFORMANCE_MODE.NORMAL,
		[performanceMode]
	);

	const shouldDebounceUpdates = useMemo(
		() => performanceMode === PERFORMANCE_MODE.HIGH_PERFORMANCE,
		[performanceMode]
	);

	const optimizedDebounceTime = useMemo(() => {
		switch (performanceMode) {
			case PERFORMANCE_MODE.HIGH_PERFORMANCE:
				return DEBOUNCE_TIME_MS * 2;
			case PERFORMANCE_MODE.OPTIMIZED:
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
			} catch {
				// Intentional: Ignore cleanup callback errors to prevent cascade failures
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
			if (usagePercent > MEMORY_THRESHOLD_PERCENT) {
				forceCleanup();
			}
		}
	}, [forceCleanup]);

	useEffect(() => {
		const interval = setInterval(checkMemoryUsage, MEMORY_CHECK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [checkMemoryUsage]);

	return {
		memoryUsage,
		registerCleanup,
		forceCleanup,
	};
}
