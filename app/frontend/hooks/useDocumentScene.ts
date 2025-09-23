"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	computeSceneSignature,
	normalizeForPersist,
	stableStringify,
	toSceneFromDoc,
} from "@/lib/documents/scene-utils";

const DOCUMENT_TTL_MS = 15_000;
const docCache = new Map<
	string,
	{ data: Record<string, unknown>; ts: number }
>();
const inflightMap = new Map<
	string,
	{ controller: AbortController; promise: Promise<unknown> }
>();

// Track recent fetch starts to dedupe back-to-back mounts (e.g., React StrictMode)
const lastFetchStartMs = new Map<string, number>();

export type ExcalidrawAPI = {
	updateScene: (scene: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
		commitToHistory?: boolean;
	}) => void;
	getAppState?: () => Record<string, unknown>;
	getSceneElementsIncludingDeleted?: () => unknown[];
	getFiles?: () => Record<string, unknown>;
};

export function useDocumentScene(
	selectedWaId: string | null | undefined,
	options?: { enabled?: boolean },
) {
	const waId = (selectedWaId || "").trim();
	const enabled =
		options && typeof options.enabled === "boolean"
			? Boolean(options.enabled)
			: true;
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loadedVerified, setLoadedVerified] = useState<boolean>(false);
	const [isDirty, setIsDirty] = useState<boolean>(false);

	const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);
	const programmaticUpdates = useRef(0);
	const loadSeqRef = useRef(0);
	const savedSizeRef = useRef(0);
	const lastSavedAtRef = useRef(0);
	const savedDigestRef = useRef<string | null>(null);
	const currentDigestRef = useRef<string | null>(null);
	const savedSignatureRef = useRef<string | null>(null);
	const currentSignatureRef = useRef<string | null>(null);
	const isDirtyRef = useRef<boolean>(false);
	const latestSceneRef = useRef<{
		elements: unknown[];
		appState: Record<string, unknown>;
		files: Record<string, unknown>;
	} | null>(null);
	const inactivitySaveTimerRef = useRef<number | null>(null);
	const lastSigComputeAtRef = useRef<number>(0);

	// Staged scene application to avoid refetch when Excalidraw API mounts
	const pendingSceneRef = useRef<Record<string, unknown> | null>(null);
	const pendingSeqRef = useRef<number>(0);

	const applyScene = useCallback(
		(scene: Record<string, unknown>, seq: number) => {
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
				isDirtyRef.current = false;
				try {
					const sig = computeSceneSignature(
						(scene as { elements?: unknown[] }).elements as
							| unknown[]
							| undefined,
						(scene as { appState?: Record<string, unknown> }).appState as
							| Record<string, unknown>
							| undefined,
						(scene as { files?: Record<string, unknown> }).files as
							| Record<string, unknown>
							| undefined,
					);
					savedSignatureRef.current = sig;
					currentSignatureRef.current = sig;
				} catch {}
			} catch {}

			const api = excalidrawAPIRef.current;
			if (api?.updateScene) {
				try {
					programmaticUpdates.current += 1;
					api.updateScene({ ...scene, commitToHistory: false });
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
			pendingSceneRef.current = scene;
			pendingSeqRef.current = seq;
		},
		[],
	);

	const onExcalidrawAPI = useCallback(
		(api: ExcalidrawAPI) => {
			excalidrawAPIRef.current = api;
			if (pendingSceneRef.current) {
				applyScene(
					pendingSceneRef.current as Record<string, unknown>,
					pendingSeqRef.current,
				);
				pendingSceneRef.current = null;
			}
		},
		[applyScene],
	);

	// Bridge loading/saving/dirty state globally for sidebar consumers
	useEffect(() => {
		if (typeof window !== "undefined") {
			(
				window as unknown as {
					__docSaveState?: {
						loading?: boolean;
						saving?: boolean;
						isDirty?: boolean;
						errorMessage?: string | null;
					};
				}
			).__docSaveState = {
				loading,
				saving,
				isDirty,
				errorMessage: error,
			};
		}
	}, [loading, saving, isDirty, error]);

	const handleSave = useCallback(async () => {
		if (!waId || !excalidrawAPIRef.current) return;
		if (!loadedVerified) return;
		try {
			let payload: Record<string, unknown>;
			if (latestSceneRef.current) {
				payload = normalizeForPersist(
					latestSceneRef.current.elements,
					latestSceneRef.current.appState,
					latestSceneRef.current.files,
				);
			} else {
				const rawAppState = (excalidrawAPIRef.current.getAppState?.() ||
					{}) as Record<string, unknown>;
				const elements =
					(excalidrawAPIRef.current.getSceneElementsIncludingDeleted?.() ||
						[]) as unknown[];
				const files = (excalidrawAPIRef.current.getFiles?.() || {}) as Record<
					string,
					unknown
				>;
				payload = normalizeForPersist(elements, rawAppState, files);
			}

			const latestSig = computeSceneSignature(
				(payload as { elements?: unknown[] }).elements || [],
				(payload as { appState?: Record<string, unknown> }).appState || {},
				(payload as { files?: Record<string, unknown> }).files || {},
			);
			if (latestSig === (savedSignatureRef.current || null)) {
				lastSavedAtRef.current = Date.now();
				return;
			}

			setSaving(true);
			setError(null);

			const payloadStr = stableStringify(payload);
			try {
				const prevSize = savedSizeRef.current || 0;
				if (prevSize > 0) {
					const minAbs = 512;
					const minRel = 0.35;
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
				setSaving(false);
				setError((guardErr as Error).message);
				return;
			}
			const res = await fetch(`/api/documents/${encodeURIComponent(waId)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ document: payload }),
			});
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Save failed");
			savedDigestRef.current = payloadStr;
			savedSizeRef.current = payloadStr.length;
			currentDigestRef.current = savedDigestRef.current;
			savedSignatureRef.current = latestSig;
			currentSignatureRef.current = latestSig;
			setIsDirty(false);
			isDirtyRef.current = false;
			lastSavedAtRef.current = Date.now();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSaving(false);
		}
	}, [waId, loadedVerified]);

	const scheduleInactivitySave = useCallback(() => {
		try {
			if (inactivitySaveTimerRef.current)
				window.clearTimeout(inactivitySaveTimerRef.current);
			inactivitySaveTimerRef.current = window.setTimeout(() => {
				try {
					if (!saving && waId && excalidrawAPIRef.current && loadedVerified) {
						void handleSave();
					}
				} catch {}
			}, 3000);
		} catch {}
	}, [saving, waId, handleSave, loadedVerified]);

	const saveIfDirty = useCallback(async () => {
		try {
			if (
				isDirtyRef.current &&
				waId &&
				excalidrawAPIRef.current &&
				loadedVerified &&
				!saving
			) {
				await handleSave();
			}
		} catch {}
	}, [waId, loadedVerified, saving, handleSave]);

	useEffect(() => {
		try {
			(
				window as unknown as {
					__docSaveHelper?: { saveIfDirty?: () => Promise<void> };
				}
			).__docSaveHelper = { saveIfDirty };
			return () => {
				try {
					(window as unknown as { __docSaveHelper?: unknown }).__docSaveHelper =
						undefined as unknown as never;
				} catch {}
			};
		} catch {
			return () => {};
		}
	}, [saveIfDirty]);

	const handleCanvasChange = useCallback(
		(
			elements: readonly unknown[] | null,
			app: Record<string, unknown> | null,
			files: Record<string, unknown> | null,
		) => {
			try {
				if (programmaticUpdates.current > 0) return;
				if (!loadedVerified) return;
				latestSceneRef.current = {
					elements: (elements as unknown[]) || [],
					appState: (app || {}) as unknown as Record<string, unknown>,
					files: (files || {}) as Record<string, unknown>,
				};
				if (typeof requestAnimationFrame !== "function") return;
				requestAnimationFrame(() => {
					try {
						const now =
							typeof performance !== "undefined"
								? performance.now()
								: Date.now();
						if (now - (lastSigComputeAtRef.current || 0) < 120) return;
						lastSigComputeAtRef.current = now;
						const snapshot = latestSceneRef.current;
						if (!snapshot) return;
						const sig = computeSceneSignature(
							snapshot.elements,
							snapshot.appState,
							snapshot.files,
						);
						currentSignatureRef.current = sig;
						const changed = sig !== (savedSignatureRef.current || null);
						if (changed !== isDirtyRef.current) {
							isDirtyRef.current = changed;
							setIsDirty(changed);
						}
						if (changed) scheduleInactivitySave();
					} catch {}
				});
			} catch {}
		},
		[loadedVerified, scheduleInactivitySave],
	);

	// Load scene on waId change (only when enabled)
	useEffect(() => {
		if (!waId || !enabled) {
			setLoading(false);
			setLoadedVerified(false);
			return;
		}
		setLoading(true);
		setError(null);
		setLoadedVerified(false);
		loadSeqRef.current = loadSeqRef.current + 1;
		const seq = loadSeqRef.current;

		const cacheKey = `/api/documents/${encodeURIComponent(waId)}`;
		const now = Date.now();

		const isCacheFresh = () => {
			const cached = docCache.get(cacheKey);
			return Boolean(cached && now - cached.ts < DOCUMENT_TTL_MS);
		};

		const maybeApplyFromCache = () => {
			const cached = docCache.get(cacheKey);
			if (!cached) return false;
			const scene = toSceneFromDoc(
				(cached.data as { document?: Record<string, unknown> })?.document,
			);
			applyScene(scene as Record<string, unknown>, seq);
			return true;
		};

		if (isCacheFresh()) {
			maybeApplyFromCache();
			setLoading(false);
			return () => {};
		}

		// If a fetch is already inflight for this key, reuse it instead of starting a new one
		const existing = inflightMap.get(cacheKey);
		if (existing) {
			try {
				// When existing promise resolves, apply from cache to current seq
				existing.promise
					.then(() => {
						const cachedDone = docCache.get(cacheKey);
						if (!cachedDone) return;
						const scene = toSceneFromDoc(
							(cachedDone.data as { document?: Record<string, unknown> })
								?.document,
						);
						applyScene(scene as Record<string, unknown>, seq);
					})
					.catch(() => {});
			} catch {}
			setLoading(true);
			return () => {};
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
		lastFetchStartMs.set(cacheKey, Date.now());
		const p = fetch(cacheKey, {
			cache: "no-store",
			signal: controller.signal,
			headers: { ...ifModifiedHeader },
		})
			.then((res) => res.json())
			.then((data) => {
				docCache.set(cacheKey, { data, ts: Date.now() });
				if (seq === loadSeqRef.current) {
					const scene = toSceneFromDoc(
						(data as { document?: Record<string, unknown> })?.document,
					);
					applyScene(scene as Record<string, unknown>, seq);
				}
			})
			.catch((err) => {
				if ((err as { name?: string })?.name === "AbortError") return;
				setError((err as Error).message);
			})
			.finally(() => {
				if (inflightMap.get(cacheKey)?.controller === controller)
					inflightMap.delete(cacheKey);
				setLoading(false);
			});

		inflightMap.set(cacheKey, { controller, promise: p });

		return () => {
			// Do not abort inflight fetch; allow dedupe/reuse across remounts
		};
	}, [waId, applyScene, enabled]);

	// Periodic autosave (only when enabled)
	useEffect(() => {
		if (!enabled) return () => {};
		const id = window.setInterval(() => {
			try {
				if (!saving && waId && excalidrawAPIRef.current && loadedVerified) {
					if (
						(currentSignatureRef.current || null) ===
						(savedSignatureRef.current || null)
					)
						return;
					void handleSave();
				}
			} catch {}
		}, 30000);
		return () => window.clearInterval(id);
	}, [saving, waId, handleSave, loadedVerified, enabled]);

	useEffect(() => {
		return () => {
			if (inactivitySaveTimerRef.current)
				window.clearTimeout(inactivitySaveTimerRef.current);
		};
	}, []);

	return {
		loading,
		saving,
		error,
		isDirty,
		loadedVerified,
		handleCanvasChange,
		onExcalidrawAPI,
		saveIfDirty,
	};
}
