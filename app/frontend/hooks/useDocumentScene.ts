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
// Legacy REST inflight tracking retained for reference; unused in WS-only path
// const inflightMap = new Map<
//     string,
//     { controller: AbortController; promise: Promise<unknown> }
// >();

// Track recent fetch starts to dedupe back-to-back mounts (e.g., React StrictMode)
// const lastFetchStartMs = new Map<string, number>();

export type ExcalidrawAPI = {
	updateScene: (scene: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
		commitToHistory?: boolean;
	}) => void;
	/** Optional resize/refresh hook exposed by Excalidraw */
	refresh?: () => void;
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

	// Guard state updates until the hook's component is actually mounted
	const isMountedRef = useRef<boolean>(false);
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const runAfterMounted = useCallback((fn: () => void) => {
		if (isMountedRef.current) {
			fn();
			return;
		}
		setTimeout(() => {
			if (isMountedRef.current) fn();
		}, 0);
	}, []);

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
				runAfterMounted(() => {
					setIsDirty(false);
					isDirtyRef.current = false;
				});
				// Notify listeners (e.g., preview) that a new scene was applied
				try {
					window.dispatchEvent(
						new CustomEvent("documents:sceneApplied", {
							detail: {
								wa_id: waId,
								scene: persisted,
							},
						}),
					);
				} catch {}
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
						if (seq === loadSeqRef.current)
							runAfterMounted(() => setLoadedVerified(true));
					}, 0);
				}
				return;
			}
			pendingSceneRef.current = scene;
			pendingSeqRef.current = seq;
		},
		[runAfterMounted, waId],
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
							runAfterMounted(() => setIsDirty(changed));
						}
						if (changed) scheduleInactivitySave();
					} catch {}
				});
			} catch {}
		},
		[loadedVerified, scheduleInactivitySave, runAfterMounted],
	);

	// Load scene on waId change (only when enabled)
	useEffect(() => {
		if (!waId || !enabled) {
			runAfterMounted(() => setLoading(false));
			runAfterMounted(() => setLoadedVerified(false));
			return;
		}
		runAfterMounted(() => setLoading(true));
		setError(null);
		runAfterMounted(() => setLoadedVerified(false));
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

		// Try cache immediately for instant paint
		try {
			if (isCacheFresh()) {
				maybeApplyFromCache();
				runAfterMounted(() => setLoading(false));
			}
		} catch {}

		// WS-first with safe REST fallback
		let wsHandled = false;
		const onWsSnapshot = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown>;
				};
				const docWaId = String(detail?.wa_id || "");
				if (!docWaId || docWaId !== waId) return;
				console.log("📥 [WS] document_snapshot received for waId", docWaId);
				const scene = toSceneFromDoc(detail?.document || {});
				applyScene(scene as Record<string, unknown>, seq);
				wsHandled = true;
				runAfterMounted(() => setLoading(false));
			} catch {}
		};
		window.addEventListener(
			"documents:sceneSnapshot",
			onWsSnapshot as EventListener,
		);
		let controller: AbortController | null = null;
		try {
			const wsRef = (
				globalThis as {
					__wsConnection?: { current?: WebSocket };
				}
			).__wsConnection;
			const send = () => {
				console.log("📤 [WS] sending get_document for waId", waId);
				wsRef?.current?.send?.(
					JSON.stringify({ type: "get_document", data: { wa_id: waId } }),
				);
			};
			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				send();
			} else if (wsRef?.current) {
				const t = setInterval(() => {
					try {
						if (wsRef?.current?.readyState === WebSocket.OPEN) {
							send();
							clearInterval(t);
						}
					} catch {}
				}, 300);
				setTimeout(() => {
					try {
						clearInterval(t);
					} catch {}
				}, 5000);
			}
		} catch {}

		// REST fallback after short delay if no WS snapshot
		const wsFallback = setTimeout(() => {
			if (wsHandled) return;
			controller = new AbortController();
			fetch(`/api/documents/${encodeURIComponent(waId)}`, {
				cache: "no-store",
				signal: controller.signal,
			})
				.then((res) => res.json())
				.then((data) => {
					const scene = toSceneFromDoc(
						(data as { document?: Record<string, unknown> })?.document,
					);
					applyScene(scene as Record<string, unknown>, seq);
				})
				.catch(() => {})
				.finally(() => runAfterMounted(() => setLoading(false)));
		}, 600);

		return () => {
			try {
				if (controller) controller.abort();
			} catch {}
			try {
				clearTimeout(wsFallback);
			} catch {}
			window.removeEventListener(
				"documents:sceneSnapshot",
				onWsSnapshot as EventListener,
			);
		};
	}, [waId, applyScene, enabled, runAfterMounted]);

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
