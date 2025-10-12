"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
	computeDocumentSignature,
	createIdleAutosaveController,
	createIntervalAutosaveController,
	requestDocumentLoad,
} from "@processes/documents";
import { DEFAULT_DOCUMENT_WA_ID, ensureDocumentInitialized, toSceneFromDoc } from "@shared/libs/documents";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

export type ExcalidrawAPI = ExcalidrawImperativeAPI;

// Remove unused alias to satisfy linter

type UseDocumentSceneOptions = {
	enabled?: boolean;
	isUnlocked?: boolean;
	autoLoadOnMount?: boolean;
};

// Helper to compute viewer camera signature (outside hook to avoid dependency issues)
function computeViewerCameraSig(viewerState: Record<string, unknown>): string {
	try {
		// Extract only numeric values to avoid nested object instability
		// Round to avoid floating-point precision issues causing false positives
		const zoomValue = (viewerState.zoom as { value?: number })?.value ?? 1;
		const scrollX = (viewerState.scrollX as number) ?? 0;
		const scrollY = (viewerState.scrollY as number) ?? 0;

		const camera = {
			zoom: Math.round(zoomValue * 1000) / 1000, // Round to 3 decimal places
			scrollX: Math.round(scrollX), // Round to nearest pixel
			scrollY: Math.round(scrollY), // Round to nearest pixel
		};
		return JSON.stringify(camera);
	} catch {
		return "";
	}
}

export function useDocumentScene(waId: string, options?: UseDocumentSceneOptions) {
	const { enabled = true, isUnlocked = true, autoLoadOnMount = true } = options || {};

	const [loading, setLoading] = useState(false);
	const [saveState, setSaveState] = useState<
		| { status: "idle" }
		| { status: "dirty" }
		| { status: "saving" }
		| { status: "saved"; at: number }
		| { status: "error"; message?: string }
	>({ status: "idle" });

	const [, startTransition] = useTransition();

	// Excalidraw API reference for the editor instance
	const apiRef = useRef<ExcalidrawAPI | null>(null);
	const isMountedRef = useRef<boolean>(false);
	const lastSavedSigRef = useRef<string | null>(null);
	const ignoreChangesUntilRef = useRef<number>(0);
	const isSavingRef = useRef<boolean>(false);
	const hasLocalEditsSinceSavingRef = useRef<boolean>(false);
	// Prevent autosave until the initial scene for current waId has been applied
	const initialSceneAppliedRef = useRef<boolean>(false);
	const latestElementsRef = useRef<unknown[] | null>(null);
	const latestAppStateRef = useRef<Record<string, unknown> | null>(null);
	const latestFilesRef = useRef<Record<string, unknown> | null>(null);
	const latestSigRef = useRef<string | null>(null);
	const lastScheduledSigRef = useRef<string | null>(null);
	const idleControllerRef = useRef<ReturnType<typeof createIdleAutosaveController> | null>(null);
	const intervalControllerRef = useRef<ReturnType<typeof createIntervalAutosaveController> | null>(null);

	// Load scene for selected waId via process (WebSocket request, no HTTP)
	// Small delay to allow REST GET to provide document first (avoids duplicate fetch)
	const lastLoadedWaIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;
		if (!autoLoadOnMount) return; // Skip if auto-load disabled
		if (!waId) return;
		let cancelled = false;
		const run = async () => {
			// Reset initial scene gate for this waId
			initialSceneAppliedRef.current = false;
			// Reset viewer camera tracking when switching documents
			lastSavedViewerSigRef.current = null;
			viewerAppStateRef.current = {};
			// Reset editor camera tracking when switching documents
			lastSavedEditorSigRef.current = null;
			editorAppStateRef.current = {};
			// removed console logging
			if (waId === DEFAULT_DOCUMENT_WA_ID) {
				// Default doc: nothing to load
				startTransition(() => setLoading(false));
				setSaveState({ status: "idle" });
				return;
			}

			// Skip if already loaded for this waId
			if (lastLoadedWaIdRef.current === waId) {
				return;
			}

			startTransition(() => setLoading(true));
			setSaveState({ status: "idle" }); // Clear status while waiting
			try {
				// Ensure document is initialized with template if first time
				await ensureDocumentInitialized(waId);

				// Wait for REST GET to complete with smart polling
				const pollIntervalMs = 50;

				// Check immediately before starting polling
				if (lastLoadedWaIdRef.current === waId) {
					if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DOCS_DEBUG === "1")
						console.log("[useDocumentScene] ⏭️ Document already loaded via REST (0ms), skipping WS");
					return;
				}

				while (true) {
					if (cancelled) return;

					// Poll every 50ms first, then check
					await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

					// Check if document was loaded via REST during the delay
					if (lastLoadedWaIdRef.current === waId) {
						return;
					}

					// Check if REST GET is still in-flight
					const restInFlight = (globalThis as { __docRestInFlight?: boolean }).__docRestInFlight;

					if (!restInFlight) {
						// REST GET completed but didn't include document, fall back to WS
						break;
					}

					// REST is still loading, keep waiting (no timeout!)
				}

				void requestDocumentLoad(waId);
				// Finish loading on documents:external-update handler
				// Avoid immediate dirty after initial scene apply
				ignoreChangesUntilRef.current = Date.now() + 800;
			} catch (e) {
				if (!cancelled) {
					setSaveState({ status: "error", message: (e as Error)?.message });
					startTransition(() => setLoading(false));
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [enabled, autoLoadOnMount, waId]);

	// Cleanup controllers
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			try {
				idleControllerRef.current?.cancel();
			} catch {}
			try {
				intervalControllerRef.current?.stop();
			} catch {}
		};
	}, []);

	// Initialize controllers once per waId
	useEffect(() => {
		if (!waId) return;
		idleControllerRef.current = createIdleAutosaveController({
			waId,
			idleMs: 3000,
			onSaving: () => {
				// removed console logging
				isSavingRef.current = true;
				hasLocalEditsSinceSavingRef.current = false;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = true;
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docHasLocalEditsDuringSave = false;
				} catch {}
				setSaveState({ status: "saving" });
			},
			onSaved: (args: { waId: string; scene: Record<string, unknown> }) => {
				// Compute signature of saved scene and update tracking
				const sig = computeDocumentSignature({
					elements: (args.scene.elements || []) as unknown[],
					appState: (args.scene.appState || {}) as Record<string, unknown>,
					files: (args.scene.files || {}) as Record<string, unknown>,
				});
				if (sig) lastSavedSigRef.current = sig;

				// Update viewer camera signature after save
				const viewerState = (args.scene.viewerAppState || {}) as Record<string, unknown>;
				if (viewerState && Object.keys(viewerState).length > 0) {
					const viewerSig = computeViewerCameraSig(viewerState);
					lastSavedViewerSigRef.current = viewerSig;
				}

				// Update editor camera signature after save
				const editorState = (args.scene.editorAppState || {}) as Record<string, unknown>;
				if (editorState && Object.keys(editorState).length > 0) {
					const editorSig = computeViewerCameraSig(editorState);
					lastSavedEditorSigRef.current = editorSig;
				}

				// removed console logging

				isSavingRef.current = false;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = false;
				} catch {}
				lastScheduledSigRef.current = null;
				if (hasLocalEditsSinceSavingRef.current) {
					setSaveState({ status: "dirty" });
				} else {
					setSaveState({ status: "saved", at: Date.now() });
					// Debounce onChange echoes right after saving
					ignoreChangesUntilRef.current = Date.now() + 800;
				}
			},
			onError: ({ message }) => {
				// removed console logging
				isSavingRef.current = false;
				lastScheduledSigRef.current = null;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = false;
				} catch {}
				const errorMessage = message;
				if (errorMessage !== undefined) {
					setSaveState({ status: "error", message: errorMessage });
				} else {
					setSaveState({ status: "error" });
				}
			},
		});
		intervalControllerRef.current = createIntervalAutosaveController({
			waId,
			intervalMs: 15000,
			onSaving: () => {
				isSavingRef.current = true;
				hasLocalEditsSinceSavingRef.current = false;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = true;
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docHasLocalEditsDuringSave = false;
				} catch {}
				setSaveState({ status: "saving" });
			},
			onSaved: () => {
				isSavingRef.current = false;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = false;
				} catch {}
				lastScheduledSigRef.current = null;
				if (hasLocalEditsSinceSavingRef.current) {
					setSaveState({ status: "dirty" });
				} else {
					setSaveState({ status: "saved", at: Date.now() });
					ignoreChangesUntilRef.current = Date.now() + 800;
				}
			},
			onError: ({ message }) => {
				isSavingRef.current = false;
				lastScheduledSigRef.current = null;
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = false;
				} catch {}
				const errorMessage = message;
				if (errorMessage !== undefined) {
					setSaveState({ status: "error", message: errorMessage });
				} else {
					setSaveState({ status: "error" });
				}
			},
		});
		return () => {
			try {
				idleControllerRef.current?.cancel();
			} catch {}
			try {
				intervalControllerRef.current?.stop();
			} catch {}
		};
	}, [waId]);

	// 15s heartbeat autosave via process controller
	useEffect(() => {
		const ctl = intervalControllerRef.current;
		const api = apiRef.current as unknown as {
			getSceneElementsIncludingDeleted?: () => unknown[];
			getAppState?: () => Record<string, unknown>;
			getFiles?: () => Record<string, unknown>;
		} | null;
		if (!enabled) {
			return () => {};
		}
		if (!waId) {
			return () => {};
		}
		if (!isUnlocked) {
			return () => {};
		}
		if (!initialSceneAppliedRef.current) {
			return () => {};
		}
		if (!ctl || !api) {
			return () => {};
		}
		ctl.start({
			getElements: () => (api?.getSceneElementsIncludingDeleted?.() || []) as unknown[],
			getAppState: () => (api?.getAppState?.() || {}) as Record<string, unknown>,
			getFiles: () => (api?.getFiles?.() || {}) as Record<string, unknown>,
		});
		return () => ctl.stop();
	}, [enabled, waId, isUnlocked]);

	// Ref to store viewer camera for saving and track changes
	const viewerAppStateRef = useRef<Record<string, unknown>>({});
	const lastSavedViewerSigRef = useRef<string | null>(null);

	// Ref to store editor camera for saving and track changes
	const editorAppStateRef = useRef<Record<string, unknown>>({});
	const lastSavedEditorSigRef = useRef<string | null>(null);

	// 3s idle autosave after changes via process controller
	const handleCanvasChange = useCallback(
		(
			elements: unknown[],
			appState: Record<string, unknown>,
			files: Record<string, unknown>,
			viewerAppState?: Record<string, unknown>,
			editorAppState?: Record<string, unknown>,
			sig?: string
		) => {
			try {
				if (!enabled || !waId || !isUnlocked) return;
				// Block autosave until the initial scene has been applied for this waId
				if (!initialSceneAppliedRef.current) {
					if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DOCS_DEBUG === "1")
						console.log("[useDocumentScene] ⏭️ skip change: initial scene not yet applied");
					return;
				}
				// Suppress thrash immediately after a save/external apply
				if (Date.now() < ignoreChangesUntilRef.current) return;

				// Update viewer camera if provided and check if it changed
				let viewerCameraChanged = false;
				if (viewerAppState) {
					const newViewerSig = computeViewerCameraSig(viewerAppState);
					viewerCameraChanged = newViewerSig !== lastSavedViewerSigRef.current;
					viewerAppStateRef.current = viewerAppState;
					// removed console logging
				}

				// Update editor camera if provided and check if it changed
				let editorCameraChanged = false;
				if (editorAppState) {
					const newEditorSig = computeViewerCameraSig(editorAppState);
					editorCameraChanged = newEditorSig !== lastSavedEditorSigRef.current;
					editorAppStateRef.current = editorAppState;
					// removed console logging
				}

				const s = sig || computeDocumentSignature({ elements, appState, files });
				const contentChanged = s && s !== lastSavedSigRef.current;
				const hasChanges = contentChanged || viewerCameraChanged || editorCameraChanged;

				// removed console logging

				// Track latest local snapshot for potential re-save after current save completes
				latestElementsRef.current = elements;
				latestAppStateRef.current = appState;
				latestFilesRef.current = files;
				latestSigRef.current = s || null;

				if (isSavingRef.current) {
					hasLocalEditsSinceSavingRef.current = true;
					try {
						(
							globalThis as unknown as {
								__docIsSaving?: boolean;
								__docHasLocalEditsDuringSave?: boolean;
							}
						).__docHasLocalEditsDuringSave = true;
					} catch {}
				}

				// Mark as dirty if content, viewer camera, or editor camera changed
				if (hasChanges && !isSavingRef.current) {
					setSaveState({ status: "dirty" });
				}

				// Schedule idle save if content changed OR viewer camera changed OR editor camera changed
				const shouldSchedule =
					hasChanges && (s !== lastScheduledSigRef.current || viewerCameraChanged || editorCameraChanged);

				if (shouldSchedule) {
					lastScheduledSigRef.current = s;
					idleControllerRef.current?.schedule({
						elements,
						appState,
						files,
						viewerAppState: viewerAppStateRef.current,
						editorAppState: editorAppStateRef.current,
						sig: s,
					});
				} else {
					// removed console logging
				}
			} catch {}
		},
		[enabled, waId, isUnlocked]
	);

	// Log saveState transitions for diagnosis
	useEffect(() => {
		// removed console logging
	}, []);

	// Apply external document updates received via websocket reducer event
	useEffect(() => {
		if (!waId) return () => {};
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown> | null;
				};
				const target = String(detail?.wa_id || "");
				if (!target || target !== waId) return;

				// removed console logging

				// Mark this waId as loaded to prevent duplicate WS request
				lastLoadedWaIdRef.current = waId;

				const doc = (detail?.document || null) as Record<string, unknown> | null;
				const scene = toSceneFromDoc(doc as Record<string, unknown> | null);
				const sig = computeDocumentSignature({
					elements: scene.elements,
					appState: scene.appState,
					files: scene.files,
				});
				// Sync last saved signature so autosave won't immediately re-save same scene
				lastSavedSigRef.current = sig;

				// Initialize viewer camera signature from loaded document
				if (scene.viewerAppState && Object.keys(scene.viewerAppState).length > 0) {
					const viewerSig = computeViewerCameraSig(scene.viewerAppState);
					lastSavedViewerSigRef.current = viewerSig;
					viewerAppStateRef.current = scene.viewerAppState;
					// removed console logging
				} else {
					lastSavedViewerSigRef.current = null;
					// removed console logging
				}

				// Initialize editor camera signature from loaded document
				if (scene.editorAppState && Object.keys(scene.editorAppState).length > 0) {
					const editorSig = computeViewerCameraSig(scene.editorAppState);
					lastSavedEditorSigRef.current = editorSig;
					editorAppStateRef.current = scene.editorAppState;
					// removed console logging
				} else {
					lastSavedEditorSigRef.current = null;
					// removed console logging
				}
				// Clear any stale save flags so the page effect doesn't ignore this apply
				try {
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docIsSaving = false;
					(
						globalThis as unknown as {
							__docIsSaving?: boolean;
							__docHasLocalEditsDuringSave?: boolean;
						}
					).__docHasLocalEditsDuringSave = false;
					// removed console logging
				} catch {}
				try {
					const ctl = idleControllerRef.current as unknown as {
						flushImmediate?: { lastSavedSig?: string };
					} | null;
					if (ctl?.flushImmediate) ctl.flushImmediate.lastSavedSig = sig;
				} catch {}
				setSaveState({ status: "saved", at: Date.now() });
				// End loading state if waiting for initial document
				try {
					startTransition(() => setLoading(false));
				} catch {}
				// Guard against onChange echo from apply
				ignoreChangesUntilRef.current = Date.now() + 800;
				// Mark initial scene applied to allow autosave & broadcast for viewers
				initialSceneAppliedRef.current = true;
				// Broadcast so any viewers can update
				try {
					window.dispatchEvent(
						new CustomEvent("documents:sceneApplied", {
							detail: { wa_id: waId, scene },
						})
					);
				} catch {}
			} catch {}
		};
		window.addEventListener("documents:external-update", handler as unknown as EventListener);
		return () => window.removeEventListener("documents:external-update", handler as unknown as EventListener);
	}, [waId]);

	// Also consider the scene applied if we receive an explicit sceneApplied event
	useEffect(() => {
		if (!waId) return () => {};
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					scene?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== waId) return;
				initialSceneAppliedRef.current = true;
				ignoreChangesUntilRef.current = Date.now() + 400;
				// removed console logging
			} catch {}
		};
		window.addEventListener("documents:sceneApplied", handler as unknown as EventListener);
		return () => window.removeEventListener("documents:sceneApplied", handler as unknown as EventListener);
	}, [waId]);

	const onExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
		apiRef.current = api;
	}, []);

	const saveStatus = useMemo(() => saveState, [saveState]);

	return {
		loading,
		handleCanvasChange,
		onExcalidrawAPI,
		saveStatus,
	} as const;
}
