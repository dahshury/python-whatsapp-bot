import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEBOUNCE_TIME_MS, LARGE_TABLE_ROWS_THRESHOLD, PerformanceMode } from "../core/types";

interface PerformanceMetrics {
	renderTime: number;
	memoryUsage: number;
	frameRate: number;
	mode: PerformanceMode;
}

// Type definition for Chrome's performance.memory API
interface ChromePerformanceMemory {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

interface ChromePerformance extends Performance {
	memory: ChromePerformanceMemory;
}

export function usePerformanceOptimization(rowCount: number) {
	const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(PerformanceMode.NORMAL);
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
		} else if (rowCount >= LARGE_TABLE_ROWS_THRESHOLD / 3) {
			setPerformanceMode(PerformanceMode.OPTIMIZED);
		} else {
			setPerformanceMode(PerformanceMode.NORMAL);
		}
	}, [rowCount]);

	const measureFrameRate = useCallback(() => {
		const now = performance.now();
		const frameTime = now - lastFrameTime.current;

		frameTimeRef.current.push(frameTime);
		if (frameTimeRef.current.length > 60) {
			frameTimeRef.current.shift();
		}

		const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
		const fps = 1000 / avgFrameTime;

		setMetrics((prev) => ({ ...prev, frameRate: Math.round(fps) }));
		lastFrameTime.current = now;

		requestAnimationFrame(measureFrameRate);
	}, []);

	const measureMemoryUsage = useCallback(() => {
		if ("memory" in performance) {
			const memory = (performance as ChromePerformance).memory;
			setMetrics((prev) => ({
				...prev,
				memoryUsage: memory.usedJSHeapSize / (1024 * 1024),
			}));
		}
	}, []);

	useEffect(() => {
		updatePerformanceMode();
	}, [updatePerformanceMode]);

	useEffect(() => {
		const rafId = requestAnimationFrame(measureFrameRate);
		const memoryInterval = setInterval(measureMemoryUsage, 1000);

		return () => {
			cancelAnimationFrame(rafId);
			clearInterval(memoryInterval);
		};
	}, [measureFrameRate, measureMemoryUsage]);

	const shouldUseVirtualization = useMemo(() => {
		return performanceMode !== PerformanceMode.NORMAL;
	}, [performanceMode]);

	const shouldDebounceUpdates = useMemo(() => {
		return performanceMode === PerformanceMode.HIGH_PERFORMANCE;
	}, [performanceMode]);

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
		cleanupCallbacks.current.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				console.warn("Error during memory cleanup:", error);
			}
		});

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
			if (usagePercent > 0.8) {
				forceCleanup();
			}
		}
	}, [forceCleanup]);

	useEffect(() => {
		const interval = setInterval(checkMemoryUsage, 5000);
		return () => clearInterval(interval);
	}, [checkMemoryUsage]);

	return {
		memoryUsage,
		registerCleanup,
		forceCleanup,
	};
}
