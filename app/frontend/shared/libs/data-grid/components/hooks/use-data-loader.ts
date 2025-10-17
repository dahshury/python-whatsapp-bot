import { useCallback, useEffect, useRef, useState } from "react";
import { PERFORMANCE_MODE, type PerformanceMode } from "../core/types";
import { ErrorHandler } from "../utils/general-utils";
import { useDebouncedCallback } from "./use-debounced-callback";

// Data loader timing constants (milliseconds)
const HIGH_PERFORMANCE_DEBOUNCE_MS = 200;
const NORMAL_DEBOUNCE_MS = 100;

// Concurrency limits for data loading
const HIGH_PERFORMANCE_CONCURRENCY = 2;
const NORMAL_CONCURRENCY = 4;

export type DataLoaderConfig = {
	pageSize: number;
	virtualRowHeight: number;
	cacheSize: number;
	prefetchPages: number;
};

export type LoaderState = {
	isLoading: boolean;
	error: Error | null;
	totalRows: number;
	loadedPages: Set<number>;
	cache: Map<number, unknown[]>;
};

export type DataRange = {
	startRow: number;
	endRow: number;
	startPage: number;
	endPage: number;
};

const DEFAULT_CONFIG: DataLoaderConfig = {
	pageSize: 1000,
	virtualRowHeight: 34,
	cacheSize: 10,
	prefetchPages: 2,
};

export function useDataLoader(
	loadDataPage: (page: number, pageSize: number) => Promise<unknown[]>,
	config: Partial<DataLoaderConfig> = {},
	performanceMode: PerformanceMode = PERFORMANCE_MODE.NORMAL
) {
	const fullConfig = { ...DEFAULT_CONFIG, ...config };
	const [loaderState, setLoaderState] = useState<LoaderState>({
		isLoading: false,
		error: null,
		totalRows: 0,
		loadedPages: new Set(),
		cache: new Map(),
	});

	const loadingRequests = useRef(new Set<number>());

	const { debouncedCallback: debouncedLoadRange } = useDebouncedCallback(
		(range: DataRange) => {
			// Fire and forget - don't await the promise
			loadDataRange(range).catch(() => {
				// Silently ignore errors
			});
		},
		performanceMode === PERFORMANCE_MODE.HIGH_PERFORMANCE
			? HIGH_PERFORMANCE_DEBOUNCE_MS
			: NORMAL_DEBOUNCE_MS
	);

	const calculateVisibleRange = useCallback(
		(scrollTop: number, viewportHeight: number): DataRange => {
			const startRow = Math.floor(scrollTop / fullConfig.virtualRowHeight);
			const endRow = Math.min(
				loaderState.totalRows - 1,
				Math.ceil((scrollTop + viewportHeight) / fullConfig.virtualRowHeight)
			);

			const startPage = Math.floor(startRow / fullConfig.pageSize);
			const endPage = Math.floor(endRow / fullConfig.pageSize);

			return { startRow, endRow, startPage, endPage };
		},
		[fullConfig.virtualRowHeight, fullConfig.pageSize, loaderState.totalRows]
	);

	const loadPage = useCallback(
		async (page: number): Promise<void> => {
			if (
				loadingRequests.current.has(page) ||
				loaderState.loadedPages.has(page)
			) {
				return;
			}

			loadingRequests.current.add(page);

			try {
				setLoaderState((prev) => ({ ...prev, isLoading: true, error: null }));

				const data = await loadDataPage(page, fullConfig.pageSize);

				setLoaderState((prev) => {
					const newCache = new Map(prev.cache);
					newCache.set(page, data);

					// Maintain cache size limit
					if (newCache.size > fullConfig.cacheSize) {
						const oldestPage = Array.from(newCache.keys())[0]; // Safe because size > 0
						if (oldestPage !== undefined) {
							newCache.delete(oldestPage);
							prev.loadedPages.delete(oldestPage);
						}
					}

					return {
						...prev,
						cache: newCache,
						loadedPages: new Set([...prev.loadedPages, page]),
						isLoading: false,
						totalRows: Math.max(
							prev.totalRows,
							(page + 1) * fullConfig.pageSize
						),
					};
				});
			} catch (error) {
				const err = error as Error;
				ErrorHandler.handleError(err, "DataLoader.loadPage");
				setLoaderState((prev) => ({ ...prev, isLoading: false, error: err }));
			} finally {
				loadingRequests.current.delete(page);
			}
		},
		[
			loadDataPage,
			fullConfig.pageSize,
			fullConfig.cacheSize,
			loaderState.loadedPages,
		]
	);

	const collectPagesToLoad = useCallback(
		(
			range: DataRange,
			state: LoaderState,
			prefetchPagesParam: number
		): number[] => {
			const pagesToLoad: number[] = [];

			// Collect main range pages
			for (let page = range.startPage; page <= range.endPage; page++) {
				const isLoaded = state.loadedPages.has(page);
				const isLoading = loadingRequests.current.has(page);
				if (!(isLoaded || isLoading)) {
					pagesToLoad.push(page);
				}
			}

			// Add prefetch pages
			for (let i = 1; i <= prefetchPagesParam; i++) {
				const nextPage = range.endPage + i;
				const prevPage = range.startPage - i;

				if (prevPage >= 0 && !state.loadedPages.has(prevPage)) {
					pagesToLoad.unshift(prevPage);
				}
				if (!state.loadedPages.has(nextPage)) {
					pagesToLoad.push(nextPage);
				}
			}

			return pagesToLoad;
		},
		[]
	);

	const loadDataRange = useCallback(
		async (range: DataRange) => {
			const pagesToLoad = collectPagesToLoad(
				range,
				loaderState,
				fullConfig.prefetchPages
			);

			// Load pages in parallel but limit concurrency
			const concurrencyLimit =
				performanceMode === PERFORMANCE_MODE.HIGH_PERFORMANCE
					? HIGH_PERFORMANCE_CONCURRENCY
					: NORMAL_CONCURRENCY;
			for (let i = 0; i < pagesToLoad.length; i += concurrencyLimit) {
				const batch = pagesToLoad.slice(i, i + concurrencyLimit);
				await Promise.all(batch.map((page) => loadPage(page)));
			}
		},
		[
			loaderState,
			fullConfig.prefetchPages,
			performanceMode,
			loadPage,
			collectPagesToLoad,
		]
	);

	const getRowData = useCallback(
		(rowIndex: number): unknown | null => {
			const page = Math.floor(rowIndex / fullConfig.pageSize);
			const pageData = loaderState.cache.get(page);

			if (!pageData) {
				return null;
			}

			const rowInPage = rowIndex % fullConfig.pageSize;
			return pageData[rowInPage] || null;
		},
		[fullConfig.pageSize, loaderState.cache]
	);

	const getRowsInRange = useCallback(
		(startRow: number, endRow: number): (unknown | null)[] => {
			const rows: (unknown | null)[] = [];
			for (let i = startRow; i <= endRow; i++) {
				rows.push(getRowData(i));
			}
			return rows;
		},
		[getRowData]
	);

	const onViewportChange = useCallback(
		(scrollTop: number, viewportHeight: number) => {
			const range = calculateVisibleRange(scrollTop, viewportHeight);
			debouncedLoadRange(range);
		},
		[calculateVisibleRange, debouncedLoadRange]
	);

	const prefetchAroundRow = useCallback(
		(rowIndex: number) => {
			const page = Math.floor(rowIndex / fullConfig.pageSize);
			const range: DataRange = {
				startRow: Math.max(0, rowIndex - fullConfig.pageSize),
				endRow: Math.min(
					loaderState.totalRows - 1,
					rowIndex + fullConfig.pageSize
				),
				startPage: Math.max(0, page - 1),
				endPage: page + 1,
			};
			debouncedLoadRange(range);
		},
		[fullConfig.pageSize, loaderState.totalRows, debouncedLoadRange]
	);

	const clearCache = useCallback(() => {
		setLoaderState((prev) => ({
			...prev,
			cache: new Map(),
			loadedPages: new Set(),
		}));
		loadingRequests.current.clear();
	}, []);

	const reloadPage = useCallback(
		async (page: number) => {
			setLoaderState((prev) => {
				const newCache = new Map(prev.cache);
				const newLoadedPages = new Set(prev.loadedPages);

				newCache.delete(page);
				newLoadedPages.delete(page);

				return {
					...prev,
					cache: newCache,
					loadedPages: newLoadedPages,
				};
			});

			await loadPage(page);
		},
		[loadPage]
	);

	const getLoadedRowCount = useCallback(
		(): number => loaderState.loadedPages.size * fullConfig.pageSize,
		[loaderState.loadedPages.size, fullConfig.pageSize]
	);

	const getCacheStats = useCallback(
		() => ({
			cacheSize: loaderState.cache.size,
			loadedPages: loaderState.loadedPages.size,
			totalRows: loaderState.totalRows,
			cacheHitRatio:
				loaderState.loadedPages.size > 0
					? loaderState.cache.size / loaderState.loadedPages.size
					: 0,
		}),
		[loaderState]
	);

	// Initial data load
	useEffect(() => {
		if (loaderState.loadedPages.size === 0) {
			loadPage(0);
		}
	}, [loadPage, loaderState.loadedPages.size]);

	const isRowLoaded = useCallback(
		(rowIndex: number): boolean => {
			const page = Math.floor(rowIndex / fullConfig.pageSize);
			return loaderState.loadedPages.has(page);
		},
		[fullConfig.pageSize, loaderState.loadedPages]
	);

	return {
		loaderState,
		getRowData,
		getRowsInRange,
		onViewportChange,
		prefetchAroundRow,
		clearCache,
		reloadPage,
		getLoadedRowCount,
		getCacheStats,
		isRowLoaded,
	};
}
