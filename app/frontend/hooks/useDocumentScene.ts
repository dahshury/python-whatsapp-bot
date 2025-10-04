"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_EXCALIDRAW_SCENE } from "@/lib/default-document";
import {
	computeSceneSignature,
	normalizeForPersist,
	stableStringify,
	toSceneFromDoc,
} from "@/lib/documents/scene-utils";

export type ExcalidrawAPI = {
	updateScene: (scene: {
		elements?: unknown[];
		appState?: Record<string, unknown>;
		files?: Record<string, unknown>;
		commitToHistory?: boolean;
	}) => void;
	refresh?: () => void;
	getAppState?: () => Record<string, unknown>;
	getSceneElementsIncludingDeleted?: () => unknown[];
	getFiles?: () => Record<string, unknown>;
};

export function useDocumentScene(
	selectedWaId: string | null | undefined,
	options?: { enabled?: boolean; isUnlocked?: boolean },
) {
	const waId = (selectedWaId || "").trim();
	const enabled = options?.enabled !== false;
	const isUnlocked = options?.isUnlocked === true;

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isDirty, setIsDirty] = useState<boolean>(false);

	const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);
	const currentWaIdRef = useRef<string>("");
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
	const programmaticUpdates = useRef(0);
	const lastSavedAtRef = useRef(0);
	const inactivitySaveTimerRef = useRef<number | null>(null);

	// Pending scene for deferred apply when API mounts
	const pendingSceneRef = useRef<Record<string, unknown> | null>(null);

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

	// Apply a scene to the canvas
	const applyScene = useCallback(
		(scene: Record<string, unknown>, forWaId: string) => {
			console.log(
				"🎨 [applyScene] forWaId:",
				forWaId,
				"current:",
				currentWaIdRef.current,
				"elements:",
				((scene as { elements?: unknown[] }).elements || []).length,
			);
			// CRITICAL: Only apply if waId still matches
			if (forWaId !== currentWaIdRef.current) {
				console.log("⚠️ [applyScene] REJECTED: waId changed");
				return;
			}

			try {
				const persisted = normalizeForPersist(
					(scene as { elements?: unknown[] }).elements || [],
					(scene as { appState?: Record<string, unknown> }).appState || {},
					(scene as { files?: Record<string, unknown> }).files || {},
				);

				const savedStr = stableStringify(persisted);
				savedDigestRef.current = savedStr;
				currentDigestRef.current = savedStr;

				const sig = computeSceneSignature(
					(scene as { elements?: unknown[] }).elements || [],
					(scene as { appState?: Record<string, unknown> }).appState || {},
					(scene as { files?: Record<string, unknown> }).files || {},
				);
				savedSignatureRef.current = sig;
				currentSignatureRef.current = sig;

				runAfterMounted(() => {
					setIsDirty(false);
					isDirtyRef.current = false;
				});

				// Notify preview listener
				try {
					window.dispatchEvent(
						new CustomEvent("documents:sceneApplied", {
							detail: { wa_id: forWaId, scene: persisted },
						}),
					);
				} catch {}

				console.log("✅ [applyScene] applied successfully");
			} catch {}

			// Apply to Excalidraw API if mounted
			const api = excalidrawAPIRef.current;
			if (api?.updateScene) {
				const doApply = () => {
					programmaticUpdates.current += 1;
					try {
						api.updateScene({ ...scene, commitToHistory: false });
						// Force canvas refresh after scene application to ensure it fills container
						try {
							const refreshApi = api as unknown as { refresh?: () => void };
							// Multiple refresh calls at intervals to handle async rendering
							requestAnimationFrame(() => {
								refreshApi.refresh?.();
								// Dispatch resize events to trigger Excalidraw's internal handlers
								try {
									window.dispatchEvent(new Event("resize"));
								} catch {}
								setTimeout(() => {
									refreshApi.refresh?.();
									try {
										window.dispatchEvent(new Event("resize"));
									} catch {}
								}, 80);
								setTimeout(() => {
									refreshApi.refresh?.();
									try {
										window.dispatchEvent(new Event("resize"));
									} catch {}
								}, 160);
								setTimeout(() => {
									refreshApi.refresh?.();
									try {
										window.dispatchEvent(new Event("resize"));
									} catch {}
								}, 320);
							});
						} catch {}
					} finally {
						setTimeout(() => {
							programmaticUpdates.current = Math.max(
								0,
								programmaticUpdates.current - 1,
							);
						}, 0);
					}
				};
				requestAnimationFrame(() => {
					requestAnimationFrame(() => setTimeout(doApply, 0));
				});
			} else {
				// Store for when API mounts
				pendingSceneRef.current = scene;
			}
		},
		[runAfterMounted],
	);

	// Handle Excalidraw API ready
	const onExcalidrawAPI = useCallback(
		(api: ExcalidrawAPI) => {
			excalidrawAPIRef.current = api;
			if (pendingSceneRef.current) {
				const scene = pendingSceneRef.current;
				const forWaId = currentWaIdRef.current;
				pendingSceneRef.current = null;
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setTimeout(() => applyScene(scene, forWaId), 0);
					});
				});
			}
		},
		[applyScene],
	);

	// Bridge state for sidebar
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

	// Save document
	const handleSave = useCallback(async () => {
		if (!waId || !excalidrawAPIRef.current) return;
		try {
			let payload: Record<string, unknown>;
			if (latestSceneRef.current) {
				payload = normalizeForPersist(
					latestSceneRef.current.elements,
					latestSceneRef.current.appState,
					latestSceneRef.current.files,
				);
			} else {
				const rawAppState = excalidrawAPIRef.current.getAppState?.() || {};
				const elements =
					excalidrawAPIRef.current.getSceneElementsIncludingDeleted?.() || [];
				const files = excalidrawAPIRef.current.getFiles?.() || {};
				payload = normalizeForPersist(elements, rawAppState, files);
			}

			const latestSig = computeSceneSignature(
				(payload as { elements?: unknown[] }).elements || [],
				(payload as { appState?: Record<string, unknown> }).appState || {},
				(payload as { files?: Record<string, unknown> }).files || {},
			);
			if (latestSig === savedSignatureRef.current) {
				lastSavedAtRef.current = Date.now();
				return;
			}

			setSaving(true);
			setError(null);

			const res = await fetch(`/api/documents/${encodeURIComponent(waId)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ document: payload }),
			});
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Save failed");

			const payloadStr = stableStringify(payload);
			savedDigestRef.current = payloadStr;
			currentDigestRef.current = payloadStr;
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
	}, [waId]);

	const scheduleInactivitySave = useCallback(() => {
		try {
			if (inactivitySaveTimerRef.current)
				window.clearTimeout(inactivitySaveTimerRef.current);
			inactivitySaveTimerRef.current = window.setTimeout(() => {
				try {
					if (!saving && waId && excalidrawAPIRef.current) {
						void handleSave();
					}
				} catch {}
			}, 3000);
		} catch {}
	}, [saving, waId, handleSave]);

	const saveIfDirty = useCallback(async () => {
		try {
			if (isDirtyRef.current && waId && excalidrawAPIRef.current && !saving) {
				await handleSave();
			}
		} catch {}
	}, [waId, saving, handleSave]);

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
						undefined;
				} catch {}
			};
		} catch {
			return () => {};
		}
	}, [saveIfDirty]);

	// Handle canvas changes (user edits)
	const handleCanvasChange = useCallback(
		(
			elements: readonly unknown[] | null,
			app: Record<string, unknown> | null,
			files: Record<string, unknown> | null,
			precomputedSignature?: string,
		) => {
			try {
				if (programmaticUpdates.current > 0) return;
				latestSceneRef.current = {
					elements: (elements as unknown[]) || [],
					appState: (app || {}) as Record<string, unknown>,
					files: (files || {}) as Record<string, unknown>,
				};

				requestAnimationFrame(() => {
					try {
						const snapshot = latestSceneRef.current;
						if (!snapshot) return;
						const sig =
							precomputedSignature ??
							computeSceneSignature(
								snapshot.elements,
								snapshot.appState,
								snapshot.files,
							);
						currentSignatureRef.current = sig;
						const changed = sig !== savedSignatureRef.current;
						if (changed !== isDirtyRef.current) {
							isDirtyRef.current = changed;
							runAfterMounted(() => setIsDirty(changed));
						}
						if (changed) scheduleInactivitySave();
					} catch {}
				});
			} catch {}
		},
		[scheduleInactivitySave, runAfterMounted],
	);

	// Main load effect: only load when enabled AND unlocked
	useEffect(() => {
		if (!enabled || !waId || !isUnlocked) {
			runAfterMounted(() => setLoading(false));
			return;
		}

		console.log("🔄 [LOAD] Starting load for waId:", waId);
		currentWaIdRef.current = waId;

		runAfterMounted(() => setLoading(true));
		setError(null);

		let wsHandled = false;
		const onWsSnapshot = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown>;
				};
				const docWaId = String(detail?.wa_id || "");
				console.log(
					"📥 [WS] snapshot received, waId:",
					docWaId,
					"expected:",
					waId,
				);

				if (docWaId !== waId) {
					console.log("⚠️ [WS] IGNORED: waId mismatch");
					return;
				}
				if (currentWaIdRef.current !== waId) {
					console.log("⚠️ [WS] IGNORED: currentWaId changed");
					return;
				}

				const doc = detail?.document || {};
				const scene = toSceneFromDoc(doc);

				// If document is empty/doesn't exist, use default
				const elems = ((scene as { elements?: unknown[] }).elements ||
					[]) as unknown[];
				console.log("📦 [WS] scene has", elems.length, "elements");

				if (elems.length === 0) {
					console.log("📄 [WS] Using default document (empty or new)");
					applyScene(DEFAULT_EXCALIDRAW_SCENE, waId);
				} else {
					applyScene(scene as Record<string, unknown>, waId);
				}

				wsHandled = true;
				runAfterMounted(() => setLoading(false));
			} catch {}
		};

		window.addEventListener(
			"documents:sceneSnapshot",
			onWsSnapshot as EventListener,
		);

		// Send WS request
		try {
			const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
				.__wsConnection;
			console.log("📤 [WS] sending get_document for waId:", waId);
			if (wsRef?.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({ type: "get_document", data: { wa_id: waId } }),
				);
			}
		} catch {}

		// REST fallback after timeout
		const fallbackTimer = setTimeout(() => {
			if (wsHandled) return;
			if (currentWaIdRef.current !== waId) return;

			console.log("🌐 [REST] fallback for waId:", waId);
			fetch(`/api/documents/${encodeURIComponent(waId)}`, { cache: "no-store" })
				.then((res) => res.json())
				.then((data) => {
					if (currentWaIdRef.current !== waId) {
						console.log("⚠️ [REST] IGNORED: currentWaId changed");
						return;
					}
					const doc =
						(data as { document?: Record<string, unknown> })?.document || {};
					const scene = toSceneFromDoc(doc);
					const elems = ((scene as { elements?: unknown[] }).elements ||
						[]) as unknown[];
					console.log("📦 [REST] scene has", elems.length, "elements");

					if (elems.length === 0) {
						console.log("📄 [REST] Using default document (empty or new)");
						applyScene(DEFAULT_EXCALIDRAW_SCENE, waId);
					} else {
						applyScene(scene as Record<string, unknown>, waId);
					}
				})
				.catch((err) => {
					console.error("❌ [REST] error:", err);
					// On error, use default document
					if (currentWaIdRef.current === waId) {
						console.log("📄 [REST] Using default document (error fallback)");
						applyScene(DEFAULT_EXCALIDRAW_SCENE, waId);
					}
				})
				.finally(() => runAfterMounted(() => setLoading(false)));
		}, 800);

		return () => {
			clearTimeout(fallbackTimer);
			window.removeEventListener(
				"documents:sceneSnapshot",
				onWsSnapshot as EventListener,
			);
		};
	}, [waId, enabled, isUnlocked, applyScene, runAfterMounted]);

	// Periodic autosave
	useEffect(() => {
		if (!enabled) return () => {};
		const id = window.setInterval(() => {
			try {
				if (!saving && waId && excalidrawAPIRef.current) {
					if (currentSignatureRef.current !== savedSignatureRef.current) {
						void handleSave();
					}
				}
			} catch {}
		}, 30000);
		return () => window.clearInterval(id);
	}, [saving, waId, handleSave, enabled]);

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
		handleCanvasChange,
		onExcalidrawAPI,
		saveIfDirty,
	};
}
