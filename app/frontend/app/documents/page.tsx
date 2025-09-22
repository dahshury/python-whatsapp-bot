"use client";

import dynamic from "next/dynamic";
import { LockIllustration } from "@/components/lock-illustration";
import "@excalidraw/excalidraw/index.css";
import type { GridCell } from "@glideapps/glide-data-grid";
import { useSearchParams } from "next/navigation";
import { useTheme as useNextThemes } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DockNav } from "@/components/dock-nav";
import { FullscreenProvider } from "@/components/glide_custom_cells/components/contexts/FullscreenContext";
import { InMemoryDataSource } from "@/components/glide_custom_cells/components/core/data-sources/InMemoryDataSource";
import type { IColumnDefinition } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import { ColumnDataType } from "@/components/glide_custom_cells/components/core/interfaces/IDataSource";
import type { DataProvider } from "@/components/glide_custom_cells/components/core/services/DataProvider";
import { createGlideTheme } from "@/components/glide_custom_cells/components/utils/streamlitGlideTheme";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useCustomerData } from "@/lib/customer-data-context";
import { DEFAULT_EXCALIDRAW_SCENE } from "@/lib/default-document";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useSettings } from "@/lib/settings-context";
import { normalizePhoneForStorage } from "@/lib/utils/phone-utils";

// Removed top combobox & save button – selection lives in sidebar on /documents

// Lightweight in-memory caches and in-flight request deduplication (per-tab)
const DOCUMENT_TTL_MS = 15_000;
const CUSTOMER_TTL_MS = 15_000;
const docCache = new Map<
	string,
	{ data: Record<string, unknown>; ts: number }
>();
const customerCache = new Map<
	string,
	{ data: { name?: string | null; age?: number | null } | null; ts: number }
>();
const inflightMap = new Map<
	string,
	{ controller: AbortController; promise: Promise<unknown> }
>();

// Load Excalidraw dynamically (SSR incompatible)
const Excalidraw = dynamic(
	async () => (await import("@excalidraw/excalidraw")).Excalidraw,
	{
		ssr: false,
	},
);

const Grid = dynamic(
	() => import("@/components/glide_custom_cells/components/Grid"),
	{ ssr: false },
);

type ExcalidrawScene = {
	elements?: unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
	commitToHistory?: boolean;
};

interface ExcalidrawAPI {
	updateScene: (scene: ExcalidrawScene) => void;
	getAppState?: () => Record<string, unknown>;
	getSceneElementsIncludingDeleted?: () => unknown[];
	getFiles?: () => Record<string, unknown>;
}

declare global {
	interface Window {
		__docSaveState?: {
			loading?: boolean;
			saving?: boolean;
			isDirty?: boolean;
		};
	}
}

export default function DocumentsPage() {
	const { isLocalized, locale } = useLanguage();
	const search = useSearchParams();
	const selectedWaId = search.get("waId") || "";
	const { resolvedTheme, theme: nextTheme } = useNextThemes();
	useSettings();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(
		null,
	);

	// Robust load/safe-save guards
	const [loadedVerified, setLoadedVerified] = useState<boolean>(false); // true only after DB doc is fetched and applied
	const loadSeqRef = useRef<number>(0); // increments per load to ignore stale responses
	const savedSizeRef = useRef<number>(0); // last persisted payload size (normalized)
	const lastSavedAtRef = useRef<number>(0);

	// Track programmatic scene updates to ignore their onChange
	const programmaticUpdates = useRef(0);

	// Track current and saved digests to compute dirty state
	const savedDigestRef = useRef<string | null>(null);
	const currentDigestRef = useRef<string | null>(null);
	const [isDirty, setIsDirty] = useState<boolean>(false);

	// Bridge loading/saving/dirty state to sidebar
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.__docSaveState = { loading, saving, isDirty };
		}
	}, [loading, saving, isDirty]);

	const stableStringify = useCallback((value: unknown): string => {
		const seen = new WeakSet();
		const replacer = (_key: string, val: unknown) => {
			if (val && typeof val === "object") {
				if (seen.has(val)) return undefined;
				seen.add(val);
				if (!Array.isArray(val)) {
					return Object.keys(val as Record<string, unknown>)
						.sort()
						.reduce(
							(acc: Record<string, unknown>, k: string) => {
								acc[k] = (val as Record<string, unknown>)[k];
								return acc;
							},
							{} as Record<string, unknown>,
						);
				}
			}
			return val;
		};
		return JSON.stringify(value, replacer);
	}, []);

	const normalizeForPersist = useCallback(
		(
			elements: unknown[],
			appState: Record<string, unknown>,
			files: Record<string, unknown>,
		) => {
			const { collaborators: _dropCollaborators, ...persistableAppState } =
				appState as Record<string, unknown> & {
					collaborators?: unknown;
				};
			return {
				elements: elements || [],
				appState: persistableAppState,
				files: files || {},
			} as Record<string, unknown>;
		},
		[],
	);

	// Staged scene application to avoid refetch when Excalidraw API mounts
	const pendingSceneRef = useRef<Record<string, unknown> | null>(null);
	const pendingSeqRef = useRef<number>(0);

	const applyScene = useCallback(
		(scene: Record<string, unknown>, seq: number) => {
			// Digest bookkeeping
			try {
				const persisted = normalizeForPersist(
					(scene as { elements?: unknown[] }).elements || [],
					(scene as { appState?: Record<string, unknown> }).appState || {},
					(scene as { files?: Record<string, unknown> }).files || {},
				);
				const savedStr = stableStringify(persisted);
				savedDigestRef.current = savedStr;
				savedSizeRef.current = savedStr.length;
				currentDigestRef.current = savedDigestRef.current;
				setIsDirty(false);
			} catch {}

			if (excalidrawAPI?.updateScene) {
				try {
					programmaticUpdates.current += 1;
					excalidrawAPI.updateScene({
						...scene,
						commitToHistory: false,
					});
				} finally {
					setTimeout(() => {
						programmaticUpdates.current = Math.max(
							0,
							programmaticUpdates.current - 1,
						);
						if (seq === loadSeqRef.current) setLoadedVerified(true);
					}, 0);
				}
				return;
			}
			// Defer until API is ready
			pendingSceneRef.current = scene;
			pendingSeqRef.current = seq;
		},
		[excalidrawAPI, normalizeForPersist, stableStringify],
	);

	useEffect(() => {
		if (!excalidrawAPI || !pendingSceneRef.current) return;
		applyScene(
			pendingSceneRef.current as Record<string, unknown>,
			pendingSeqRef.current,
		);
		pendingSceneRef.current = null;
	}, [excalidrawAPI, applyScene]);

	useEffect(() => {
		if (!selectedWaId) return;
		setLoading(true);
		setError(null);
		setLoadedVerified(false);
		loadSeqRef.current = loadSeqRef.current + 1;
		const seq = loadSeqRef.current;

		const cacheKey = `/api/documents/${encodeURIComponent(selectedWaId)}`;
		const now = Date.now();

		const isCacheFresh = () => {
			const cached = docCache.get(cacheKey);
			return Boolean(cached && now - cached.ts < DOCUMENT_TTL_MS);
		};

		const toScene = (doc: Record<string, unknown> | undefined | null) => {
			const d = doc || DEFAULT_EXCALIDRAW_SCENE;
			return {
				elements: Array.isArray((d as { elements?: unknown[] })?.elements)
					? (d as { elements?: unknown[] }).elements
					: [],
				appState: (() => {
					const app =
						(d as { appState?: Record<string, unknown> })?.appState || {};
					return {
						...(app as Record<string, unknown>),
						collaborators: new Map(),
					} as Record<string, unknown>;
				})(),
				files: (d as { files?: Record<string, unknown> })?.files || {},
			};
		};

		const maybeApplyFromCache = () => {
			const cached = docCache.get(cacheKey);
			if (!cached) return false;
			applyScene(
				toScene(
					(cached.data as { document?: Record<string, unknown> })?.document,
				),
				seq,
			);
			return true;
		};

		// Serve fresh cache instantly if available
		if (isCacheFresh()) {
			maybeApplyFromCache();
		}

		// Abort prior in-flight request for same key
		const prior = inflightMap.get(cacheKey);
		if (prior) {
			try {
				prior.controller.abort();
			} catch {}
			inflightMap.delete(cacheKey);
		}

		const controller = new AbortController();
		const prevUpdatedAtUnknown = (
			docCache.get(cacheKey)?.data as { updated_at?: unknown } | undefined
		)?.updated_at;
		const ifModifiedHeader =
			prevUpdatedAtUnknown !== undefined && prevUpdatedAtUnknown !== null
				? {
						"If-Modified-Since": String(
							prevUpdatedAtUnknown as string | number | Date,
						),
					}
				: {};
		const p = fetch(cacheKey, {
			cache: "no-store",
			signal: controller.signal,
			headers: { ...ifModifiedHeader },
		})
			.then((res) => res.json())
			.then((data) => {
				docCache.set(cacheKey, { data, ts: Date.now() });
				// If we already served from cache, only apply if this response is newer and still latest
				if (seq === loadSeqRef.current) {
					applyScene(
						toScene((data as { document?: Record<string, unknown> })?.document),
						seq,
					);
				}
			})
			.catch((err) => {
				if (err?.name === "AbortError") return; // ignore
				setError((err as Error).message);
			})
			.finally(() => {
				if (inflightMap.get(cacheKey)?.controller === controller)
					inflightMap.delete(cacheKey);
				setLoading(false);
			});

		inflightMap.set(cacheKey, { controller, promise: p });

		return () => {
			try {
				controller.abort();
			} catch {}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedWaId, applyScene]);

	const handleSave = useCallback(async () => {
		if (!selectedWaId || !excalidrawAPI) return;
		if (!loadedVerified) return; // never save unless verified load completed
		setSaving(true);
		setError(null);
		try {
			const rawAppState = (excalidrawAPI.getAppState?.() || {}) as Record<
				string,
				unknown
			>;
			const elements = (excalidrawAPI.getSceneElementsIncludingDeleted?.() ||
				[]) as unknown[];
			const files = (excalidrawAPI.getFiles?.() || {}) as Record<
				string,
				unknown
			>;
			const payload = normalizeForPersist(elements, rawAppState, files);
			// Second-line defense: block suspiciously small saves compared to last persisted size
			try {
				const payloadStr = stableStringify(payload);
				const prevSize = savedSizeRef.current || 0;
				if (prevSize > 0) {
					const minAbs = 512; // do not accept tiny documents unless initial
					const minRel = 0.35; // must be at least 35% of previous size
					if (
						payloadStr.length <
						Math.min(prevSize * minRel, Math.max(prevSize - 20000, prevSize))
					) {
						if (payloadStr.length < Math.max(minAbs, prevSize * minRel)) {
							throw new Error("Suspiciously small document; auto-save blocked");
						}
					}
				}
			} catch (guardErr) {
				// Keep dirty flag; surface a non-blocking warning
				setSaving(false);
				setError((guardErr as Error).message);
				return;
			}
			const res = await fetch(
				`/api/documents/${encodeURIComponent(selectedWaId)}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ document: payload }),
				},
			);
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Save failed");
			// Update saved digest
			const savedStr = stableStringify(payload);
			savedDigestRef.current = savedStr;
			savedSizeRef.current = savedStr.length;
			currentDigestRef.current = savedDigestRef.current;
			setIsDirty(false);
			lastSavedAtRef.current = Date.now();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSaving(false);
		}
	}, [
		selectedWaId,
		excalidrawAPI,
		normalizeForPersist,
		stableStringify,
		loadedVerified,
	]);

	// Legacy loader removed; handled by cached effect above

	// Track user edits via Excalidraw onChange and compute dirty state
	const handleCanvasChange = useCallback(
		(
			elements: readonly unknown[] | null,
			app: Record<string, unknown> | null,
			files: Record<string, unknown> | null,
		) => {
			try {
				if (programmaticUpdates.current > 0) return;
				if (!loadedVerified) return; // ignore changes until verified load completed
				const norm = normalizeForPersist(
					(elements as unknown[]) || [],
					(app || {}) as unknown as Record<string, unknown>,
					(files || {}) as Record<string, unknown>,
				);
				const digest = stableStringify(norm);
				currentDigestRef.current = digest;
				setIsDirty(digest !== (savedDigestRef.current || null));
			} catch {}
		},
		[normalizeForPersist, stableStringify, loadedVerified],
	);

	// Auto-save every 5s when dirty and verified
	useEffect(() => {
		const id = window.setInterval(() => {
			try {
				if (
					!saving &&
					isDirty &&
					selectedWaId &&
					excalidrawAPI &&
					loadedVerified
				) {
					void handleSave();
				}
			} catch {}
		}, 5000);
		return () => window.clearInterval(id);
	}, [
		saving,
		isDirty,
		selectedWaId,
		excalidrawAPI,
		handleSave,
		loadedVerified,
	]);

	// Documents customer grid state
	const [customerLoading, setCustomerLoading] = useState(false);
	const [customerError, setCustomerError] = useState<string | null>(null);
	const [customerDataSource, setCustomerDataSource] =
		useState<InMemoryDataSource | null>(null);
	const customerProviderRef = useRef<DataProvider | null>(null);
	const [isCustomerDataComplete, setIsCustomerDataComplete] =
		useState<boolean>(false);
	const hasLoadedCustomerOnceRef = useRef<boolean>(false);
	const [validationErrors, setValidationErrors] = useState<
		Array<{ row: number; col: number; message: string; fieldName?: string }>
	>([]);
	const prevValidationErrorsRef = useRef<string>("[]");

	const isDarkMode = useMemo(() => {
		const desired = (
			nextTheme && nextTheme !== "system" ? nextTheme : resolvedTheme
		) as string | undefined;
		return desired === "dark";
	}, [resolvedTheme, nextTheme]);
	const excalidrawLang = useMemo(
		() => (locale === "ar" ? "ar-SA" : locale),
		[locale],
	);
	const excalidrawTheme = useMemo(() => {
		const desired = (
			nextTheme && nextTheme !== "system" ? nextTheme : resolvedTheme
		) as string | undefined;
		return desired === "dark" ? "dark" : "light";
	}, [nextTheme, resolvedTheme]);
	const [_gridThemeTick, setGridThemeTick] = useState(0);
	useEffect(() => {
		// Recompute after theme class & CSS variables apply
		const id = requestAnimationFrame(() => setGridThemeTick((t) => t + 1));
		return () => cancelAnimationFrame(id);
	}, []);

	// Ensure recomputation when html.dark toggles (e.g., switching from system -> light)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const el = document.documentElement;
		let prevDark = el.classList.contains("dark");
		const observer = new MutationObserver(() => {
			const currDark = el.classList.contains("dark");
			if (currDark !== prevDark) {
				prevDark = currDark;
				// Next frame to allow CSS variables to settle
				requestAnimationFrame(() => setGridThemeTick((t) => t + 1));
			}
		});
		observer.observe(el, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);
	const gridTheme = useMemo(
		() => createGlideTheme(isDarkMode ? "dark" : "light"),
		[isDarkMode],
	);
	const { customers } = useCustomerData();

	// Build column definitions for Name, Age, Phone
	const customerColumns: IColumnDefinition[] = useMemo(() => {
		return [
			{
				id: "name",
				name: "name",
				title: i18n.getMessage("field_name", isLocalized),
				dataType: ColumnDataType.TEXT,
				isEditable: true,
				isRequired: true,
				width: 220,
			},
			{
				id: "age",
				name: "age",
				title: i18n.getMessage("field_age", isLocalized),
				dataType: ColumnDataType.NUMBER,
				isEditable: true,
				isRequired: true,
				width: 100,
				validationRules: [
					{ type: "min", value: 10 },
					{ type: "max", value: 120 },
				],
			},
			{
				id: "phone",
				name: "phone",
				title: i18n.getMessage("field_phone", isLocalized),
				dataType: ColumnDataType.PHONE,
				isEditable: true,
				isRequired: true,
				width: 320,
			},
		];
	}, [isLocalized]);

	// Placeholder empty data source to show an empty grid on first load
	const placeholderCustomerDataSource = useMemo(() => {
		if (!selectedWaId) return null;
		const initialRow: unknown[] = ["", null, selectedWaId || ""];
		return new InMemoryDataSource(1, customerColumns.length, customerColumns, [
			initialRow,
		]);
	}, [selectedWaId, customerColumns]);

	// Debounced save helper
	const saveCustomerDebouncedRef = useRef<number | null>(null);

	// Determine if all required customer fields in row 0 are complete and valid
	const computeIsCustomerComplete = useCallback(
		(provider: DataProvider | null): boolean => {
			try {
				if (!provider) return false;
				const rowIndex = 0;
				const colCount = provider.getColumnCount?.() ?? 0;
				for (let c = 0; c < colCount; c++) {
					const colDef = provider.getColumnDefinition?.(c) as
						| IColumnDefinition
						| undefined;
					if (!colDef || colDef.isRequired !== true) continue;
					const cell: unknown = provider.getCell?.(c, rowIndex);
					if (!cell) return false;
					if (
						typeof cell === "object" &&
						cell !== null &&
						"isMissingValue" in (cell as Record<string, unknown>) &&
						Boolean((cell as { isMissingValue?: boolean }).isMissingValue) ===
							true
					)
						return false;
					// Additional type-aware checks
					switch (colDef.dataType) {
						case ColumnDataType.TEXT: {
							const v = (cell as { data?: unknown })?.data as unknown;
							if (!(typeof v === "string" && v.trim().length > 0)) return false;
							break;
						}
						case ColumnDataType.NUMBER: {
							const v = (cell as { data?: unknown })?.data as unknown;
							const num =
								typeof v === "number" && Number.isFinite(v)
									? v
									: Number(v as unknown);
							if (!Number.isFinite(num)) return false;
							const rules =
								(
									colDef as {
										validationRules?: Array<{ type: string; value?: number }>;
									}
								).validationRules || [];
							for (const r of rules) {
								if (
									r?.type === "min" &&
									r.value !== undefined &&
									num < Number(r.value)
								)
									return false;
								if (
									r?.type === "max" &&
									r.value !== undefined &&
									num > Number(r.value)
								)
									return false;
							}
							break;
						}
						case ColumnDataType.PHONE: {
							const kind = (cell as { kind?: string })?.kind;
							const data = (
								cell as { data?: { kind?: string; value?: unknown } | unknown }
							)?.data as { kind?: string; value?: unknown } | unknown;
							let phoneStr = "";
							if (
								kind === "Custom" &&
								(data as { kind?: string })?.kind === "phone-cell"
							) {
								phoneStr = String((data as { value?: unknown })?.value ?? "");
							} else {
								phoneStr = String((cell as { data?: unknown })?.data ?? "");
							}
							if (phoneStr.trim().length === 0) return false;
							break;
						}
						default:
							return false;
					}
				}
				return true;
			} catch {
				return false;
			}
		},
		[],
	);

	// Compute detailed validation errors for tooltips (similar to calendar dialog)
	const computeValidationErrors = useCallback(
		(
			provider: DataProvider | null,
		): Array<{
			row: number;
			col: number;
			message: string;
			fieldName?: string;
		}> => {
			try {
				if (!provider) return [];
				const editingState = provider.getEditingState?.();
				const colCount: number = provider.getColumnCount?.() ?? 0;
				const columns: Array<{
					id?: string;
					name?: string;
					title?: string;
					width?: number;
					isEditable?: boolean;
					isHidden?: boolean;
					isRequired?: boolean;
					isPinned?: boolean;
					isIndex?: boolean;
					indexNumber: number;
					contentAlignment?: string;
					defaultValue?: unknown;
					columnTypeOptions?: Record<string, unknown>;
				}> = [];
				for (let i = 0; i < colCount; i++) {
					const def = provider.getColumnDefinition?.(i) as
						| IColumnDefinition
						| undefined;
					columns.push({
						id: def?.id ?? def?.name ?? `col_${i}`,
						name: def?.name ?? def?.id ?? `col_${i}`,
						title: def?.title ?? def?.name ?? def?.id ?? `Column ${i}`,
						width: def?.width ?? 150,
						isEditable: def?.isEditable !== false,
						isHidden: def?.isHidden === true,
						isRequired: def?.isRequired === true,
						isPinned: def?.isPinned === true,
						isIndex: false,
						indexNumber: i,
						contentAlignment: "left",
						defaultValue: def?.defaultValue,
						columnTypeOptions: {},
					});
				}
				const base = (
					editingState && typeof editingState.validateCells === "function"
						? (
								editingState.validateCells as (columns: unknown) => {
									isValid: boolean;
									errors: Array<{ row: number; col: number; message: string }>;
								}
							)(columns as unknown)
						: undefined
				) as
					| {
							isValid: boolean;
							errors: Array<{ row: number; col: number; message: string }>;
					  }
					| undefined;
				const errs = (base?.errors || []).map((e) => {
					const col = columns[e.col];
					const fieldName = (col?.name ||
						col?.id ||
						col?.title ||
						`Column ${e.col}`) as string | undefined;
					return {
						row: e.row,
						col: e.col,
						message: e.message,
						...(fieldName ? { fieldName } : {}),
					};
				});
				return errs;
			} catch {
				return [];
			}
		},
		[],
	);

	const updateValidationState = useCallback(
		(provider: DataProvider) => {
			try {
				// Update completeness only if changed
				const complete = computeIsCustomerComplete(provider);
				setIsCustomerDataComplete((prev) =>
					prev !== complete ? complete : prev,
				);

				// Update validation errors only if content changed
				const errs = computeValidationErrors(provider);
				const key = stableStringify(errs);
				if (key !== prevValidationErrorsRef.current) {
					prevValidationErrorsRef.current = key;
					setValidationErrors(errs);
				}
			} catch {}
		},
		[computeIsCustomerComplete, computeValidationErrors, stableStringify],
	);

	const scheduleSaveCustomer = useCallback(() => {
		if (!customerProviderRef.current || !selectedWaId) return;
		if (saveCustomerDebouncedRef.current)
			window.clearTimeout(saveCustomerDebouncedRef.current);
		saveCustomerDebouncedRef.current = window.setTimeout(async () => {
			try {
				const provider = customerProviderRef.current;
				if (!provider) return;
				// Read cells from first row
				const readCell = (colIndex: number): unknown => {
					const cell = provider.getCell(colIndex, 0) as unknown;
					if (
						cell &&
						typeof cell === "object" &&
						"kind" in (cell as Record<string, unknown>) &&
						(cell as { kind?: string }).kind === "Custom" &&
						"data" in (cell as Record<string, unknown>) &&
						(cell as { data?: { kind?: string; value?: unknown } | unknown })
					)
						return (cell as {
							data?: { kind?: string; value?: unknown } | unknown;
						}) &&
							typeof (cell as { data?: unknown }).data === "object" &&
							(cell as { data?: { kind?: string } }).data &&
							(cell as { data?: { kind?: string } }).data?.kind === "phone-cell"
							? String(
									(cell as { data?: { value?: unknown } }).data?.value ?? "",
								)
							: ((cell as { data?: unknown }).data ?? null);
					return (cell as { data?: unknown })?.data ?? null;
				};
				const name = String(readCell(0) ?? "");
				const ageRaw = readCell(1);
				const parsedAge =
					ageRaw === null ||
					ageRaw === undefined ||
					Number.isNaN(Number(ageRaw))
						? null
						: Number(ageRaw);
				const age = parsedAge !== null && parsedAge < 10 ? null : parsedAge;

				// Validate completeness using provider's validation state
				setIsCustomerDataComplete(computeIsCustomerComplete(provider));

				await fetch(`/api/customers/${encodeURIComponent(selectedWaId)}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, age }),
				});
			} catch {}
		}, 400);
	}, [selectedWaId, computeIsCustomerComplete]);

	// Keep a ref to customers to avoid refiring effect on context updates
	const customersRef = useRef(customers);
	useEffect(() => {
		customersRef.current = customers;
	}, [customers]);

	// Load customer row when waId changes (deduped + cached + abortable)
	useEffect(() => {
		if (!selectedWaId) {
			setCustomerDataSource(null);
			setIsCustomerDataComplete(false);
			return;
		}
		setIsCustomerDataComplete(false);
		setCustomerLoading(true);
		setCustomerError(null);

		const cacheKey = `/api/customers/${encodeURIComponent(selectedWaId)}`;
		const now = Date.now();
		const cached = customerCache.get(cacheKey);
		const isFresh = Boolean(cached && now - cached.ts < CUSTOMER_TTL_MS);

		const applyCustomer = (
			payload: { name?: string | null; age?: number | null } | null,
		) => {
			// Fallback name from live customer context when backend has none
			let fallbackName = "";
			try {
				const target = normalizePhoneForStorage(selectedWaId || "");
				const match = (customersRef.current || []).find((c) => {
					const idMatch =
						normalizePhoneForStorage(String(c.id || "")) === target;
					const phoneMatch =
						normalizePhoneForStorage(String(c.phone || "")) === target;
					return idMatch || phoneMatch;
				});
				fallbackName = (match?.name || "").trim();
			} catch {}
			const normalizedAge =
				typeof payload?.age === "number" && payload?.age > 0
					? payload?.age
					: null;
			const initialRow: unknown[] = [
				payload?.name || fallbackName || "",
				normalizedAge,
				selectedWaId || "",
			];
			const ds = new InMemoryDataSource(
				1,
				customerColumns.length,
				customerColumns,
				[initialRow],
			);
			setCustomerDataSource(ds);
			hasLoadedCustomerOnceRef.current = true;
			// Lock by default; will recompute after provider initializes/edits
			setIsCustomerDataComplete(false);
		};

		// Serve from cache immediately if fresh
		if (isFresh) {
			applyCustomer(cached?.data || null);
			setCustomerLoading(false);
		}

		// Deduplicate + abortable fetch
		const prior = inflightMap.get(cacheKey);
		if (prior) {
			try {
				prior.controller.abort();
			} catch {}
			inflightMap.delete(cacheKey);
		}
		const controller = new AbortController();
		const p = fetch(cacheKey, { cache: "no-store", signal: controller.signal })
			.then((resp) => resp.json().catch(() => ({})))
			.then((data) => {
				const payload =
					(data?.data as {
						name?: string | null;
						age?: number | null;
					} | null) || null;
				customerCache.set(cacheKey, { data: payload, ts: Date.now() });
				applyCustomer(payload);
			})
			.catch((err) => {
				if (err?.name === "AbortError") return;
				setCustomerError((err as Error).message);
			})
			.finally(() => {
				if (inflightMap.get(cacheKey)?.controller === controller)
					inflightMap.delete(cacheKey);
				setCustomerLoading(false);
			});
		inflightMap.set(cacheKey, { controller, promise: p });

		return () => {
			try {
				controller.abort();
			} catch {}
		};
		// Do not depend on customers to avoid refetch storms; we use customersRef snapshot for fallback
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedWaId, customerColumns]);

	// Render
	return (
		<SidebarInset>
			<header className="relative flex h-16 shrink-0 items-center justify-center border-b px-4">
				<SidebarTrigger className="absolute left-4" />
				<DockNav className="mt-0" />
			</header>
			<div className="flex flex-col gap-2 p-4 h-[calc(100vh-4rem)]">
				{error && <span className="text-sm text-red-500">{error}</span>}
				{/* Minimal customer info grid */}
				<div className="w-full">
					{selectedWaId ? (
						<div className="relative transition-[width] duration-300 ease-out">
							{customerLoading && (
								<div className="absolute inset-0 grid place-items-center pointer-events-none z-10 bg-black/60">
									<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
								</div>
							)}
							{customerError && (
								<div className="p-2 text-sm text-red-500">{customerError}</div>
							)}
							{Grid && (
								<FullscreenProvider>
									<Grid
										key={`customer-grid-${selectedWaId || "none"}`}
										showThemeToggle={false}
										fullWidth={true}
										theme={gridTheme}
										isDarkMode={isDarkMode}
										dataSource={
											customerDataSource ||
											placeholderCustomerDataSource ||
											new InMemoryDataSource(
												1,
												customerColumns.length,
												customerColumns,
												[["", null, selectedWaId || ""]],
											)
										}
										validationErrors={validationErrors}
										{...{}}
										// Use compact heights like hover card
										rowHeight={24}
										headerHeight={22}
										hideAppendRowPlaceholder={true}
										rowMarkers="none"
										disableTrailingRow={true}
										className="!border-0 m-0 p-0"
										/* onReady no-op: immediate grid rendering */
										onAddRowOverride={() => {
											// Clear current row cells and keep focus for new entry
											try {
												const provider =
													customerProviderRef.current as DataProvider;
												if (!provider) return;
												const colCount = provider.getColumnCount();
												for (let c = 0; c < colCount; c++) {
													const colDef = provider.getColumnDefinition(c);
													// Use column default on clear
													let value: unknown = null;
													switch (colDef.dataType) {
														case ColumnDataType.PHONE:
														case ColumnDataType.TEXT:
															value = "";
															break;
														case ColumnDataType.NUMBER:
															value = null;
															break;
														default:
															value = null;
													}
													const cell = provider.getCell(c, 0);
													const updated = { ...(cell as unknown as GridCell) };
													(
														updated as { data?: unknown; displayData?: unknown }
													).data = value as unknown;
													(
														updated as { data?: unknown; displayData?: unknown }
													).displayData = value as unknown;
													provider.setCell(
														c,
														0,
														updated as unknown as GridCell,
													);
												}
												setIsCustomerDataComplete(false);
											} catch {}
										}}
										onDataProviderReady={(provider: unknown) => {
											customerProviderRef.current = provider as DataProvider;
											try {
												(provider as DataProvider)
													.getEditingState()
													.onChange(() => {
														scheduleSaveCustomer();
														try {
															updateValidationState(provider as DataProvider);
														} catch {}
													});
											} catch {}

											// Force validation on all existing cells after provider is ready
											// This ensures validation highlighting appears for pre-loaded data
											setTimeout(() => {
												try {
													const dp = provider as DataProvider;
													const rowCount = dp.getRowCount();
													const colCount = dp.getColumnCount();

													// Trigger validation by re-setting each cell with its current value
													for (let r = 0; r < rowCount; r++) {
														for (let c = 0; c < colCount; c++) {
															const currentCell = dp.getCell(c, r);
															if (currentCell && "data" in currentCell) {
																const cellData = (
																	currentCell as { data?: unknown }
																).data;
																if (
																	cellData !== undefined &&
																	cellData !== null &&
																	cellData !== ""
																) {
																	// Re-set the cell to trigger validation
																	dp.setCell(c, r, currentCell);
																}
															}
														}
													}

													// Update validation state after forcing validation
													updateValidationState(dp);
												} catch (error) {
													console.error(
														"Error forcing initial validation:",
														error,
													);
												}
											}, 100); // Small delay to ensure data is fully loaded
										}}
									/>
								</FullscreenProvider>
							)}
						</div>
					) : (
						<div className="text-sm text-muted-foreground">
							{i18n.getMessage("documents_select_customer", isLocalized)}
						</div>
					)}
				</div>

				<div className="flex-1 min-h-0">
					<div
						className="w-full h-full border rounded-md overflow-hidden bg-background relative"
						aria-busy={loading}
					>
						<div
							className={`w-full h-full transition-opacity ${loading || !isCustomerDataComplete ? "opacity-30 pointer-events-none" : "opacity-100"}`}
						>
							<div className="excali-theme-scope w-full h-full">
								<Excalidraw
									theme={excalidrawTheme}
									langCode={excalidrawLang as unknown as string}
									onChange={(els, app, files) =>
										handleCanvasChange(
											(els || []) as unknown[],
											(app || {}) as unknown as Record<string, unknown>,
											(files || {}) as Record<string, unknown>,
										)
									}
									excalidrawAPI={(api: unknown) =>
										setExcalidrawAPI(api as ExcalidrawAPI)
									}
								/>
							</div>
						</div>
						{!isCustomerDataComplete && (
							<div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
								<LockIllustration className="h-full w-auto max-w-[56%] opacity-95" />
							</div>
						)}
						{loading ? (
							<div className="absolute inset-0 grid place-items-center pointer-events-auto z-10 cursor-wait bg-black/50">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
							</div>
						) : null}
					</div>
				</div>
			</div>
		</SidebarInset>
	);
}
