"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { broadcastSceneApplied } from "@processes/documents/document-events.process";
import { computeDocumentSignature } from "@processes/documents/document-save.process";
import { computeViewerCameraSig } from "@shared/libs/documents";
import { useCanvasChangeHandler } from "@widgets/document-canvas/hooks/use-canvas-change-handler";

import type {
	ExcalidrawAPI,
	UseDocumentSceneReturn,
} from "@widgets/document-canvas/types";
import { useDocumentsExternalUpdates } from "@widgets/documents/hooks/use-documents-external-updates";
import { useSceneAppliedListener } from "@widgets/documents/hooks/use-scene-applied-listener";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { useDocumentAutoLoad } from "./use-document-auto-load";
import { useDocumentAutosaveControllers } from "./use-document-autosave-controllers";

// Remove unused alias to satisfy linter

type UseDocumentSceneOptions = {
	enabled?: boolean;
	isUnlocked?: boolean;
	autoLoadOnMount?: boolean;
};

// computeViewerCameraSig moved to @shared/libs/documents

// Delay to wait after external scene update before allowing local changes
const EXTERNAL_SCENE_UPDATE_SUPPRESS_MS = 800;

export function useDocumentScene(
	waId: string,
	options?: UseDocumentSceneOptions
): UseDocumentSceneReturn {
	const {
		enabled = true,
		isUnlocked = true,
		autoLoadOnMount = true,
	} = options || {};

	const [loading, setLoading] = useState(false);
	const [saveState, setSaveState] = useState<
		| { status: "idle" }
		| { status: "dirty" }
		| { status: "saving" }
		| { status: "saved"; at: number }
		| { status: "error"; message?: string }
	>({ status: "idle" });
	const saveStateRef = useRef<{ status: string }>({ status: "idle" });
	useEffect(() => {
		saveStateRef.current = { status: saveState.status } as { status: string };
	}, [saveState]);

	const [, startTransition] = useTransition();

	// Excalidraw API reference for the editor instance
	const apiRef = useRef<ExcalidrawAPI | null>(null);
	const isMountedRef = useRef<boolean>(false);
	const ignoreChangesUntilRef = useRef<number>(0);
	const hasLocalEditsSinceSavingRef = useRef<boolean>(false);
	// Prevent autosave until the initial scene for current waId has been applied
	const initialSceneAppliedRef = useRef<boolean>(false);
	const latestElementsRef = useRef<unknown[] | null>(null);
	const latestAppStateRef = useRef<Record<string, unknown> | null>(null);
	const latestFilesRef = useRef<Record<string, unknown> | null>(null);
	const latestSigRef = useRef<string | null>(null);
	const lastScheduledSigRef = useRef<string | null>(null);
	// moved to useDocumentAutosaveControllers

	// Load scene for selected waId via process (WebSocket request, no HTTP)
	// Small delay to allow REST GET to provide document first (avoids duplicate fetch)
	const lastLoadedWaIdRef = useRef<string | null>(null);

	// Ref to store editor camera state and signature (used by autosave and change handler)
	const editorAppStateRef = useRef<Record<string, unknown>>({});
	const lastSavedEditorSigRef = useRef<string | null>(null);
	// Track whether interval autosave has been started
	const intervalStartedRef = useRef<boolean>(false);

	useDocumentAutoLoad({
		waId,
		enabled,
		autoLoadOnMount,
		startTransitionAction: startTransition,
		setLoadingAction: setLoading,
		lastLoadedWaIdRef,
		initialSceneAppliedRef,
		ignoreChangesUntilRef,
		editorAppStateRef,
		lastSavedEditorSigRef,
	});

	const {
		idleControllerRef,
		intervalControllerRef,
		lastSavedSigRef,
		isSavingRef,
	} = useDocumentAutosaveControllers({
		waId,
		setSaveStateAction: setSaveState,
		computeDocumentSignatureAction: computeDocumentSignature,
		ignoreChangesUntilRef,
		hasLocalEditsSinceSavingRef,
	});

	// Cleanup controllers
	/* biome-ignore lint/correctness/useExhaustiveDependencies: controller refs are stable; cleanup only on unmount */
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			try {
				idleControllerRef.current?.cancel?.();
			} catch {
				// Intentional: cancel may fail
			}
			try {
				intervalControllerRef.current?.stop?.();
			} catch {
				// Intentional: stop may fail
			}
		};
	}, []);

	// 15s heartbeat autosave via process controller
	/* biome-ignore lint/correctness/useExhaustiveDependencies: depends on stable refs; re-init only when flags change */
	useEffect(() => {
		const ctl = intervalControllerRef.current;
		const api = apiRef.current as unknown as {
			getSceneElements?: () => unknown[];
			getAppState?: () => Record<string, unknown>;
			getFiles?: () => Record<string, unknown>;
		} | null;
		if (!enabled) {
			return;
		}
		if (!waId) {
			return;
		}
		if (!isUnlocked) {
			return;
		}
		if (!initialSceneAppliedRef.current) {
			return;
		}
		if (!(ctl && api)) {
			return;
		}
		if (!intervalStartedRef.current) {
			ctl?.start?.({
				getElements: () => (api?.getSceneElements?.() || []) as unknown[],
				getAppState: () =>
					(api?.getAppState?.() || {}) as Record<string, unknown>,
				getFiles: () => (api?.getFiles?.() || {}) as Record<string, unknown>,
			});
			intervalStartedRef.current = true;
		}
		return () => {
			try {
				ctl?.stop?.();
			} catch {
				// Intentional: stop may fail
			}
			intervalStartedRef.current = false;
		};
	}, [enabled, waId, isUnlocked]);

	// viewer/editor refs declared above

	// 3s idle autosave after changes via process controller
	const handleCanvasChange = useCanvasChangeHandler({
		enabled,
		waId,
		isUnlocked,
		initialSceneAppliedRef,
		ignoreChangesUntilRef,
		editorAppStateRef,
		lastSavedEditorSigRef,
		lastSavedSigRef,
		lastScheduledSigRef,
		isSavingRef,
		hasLocalEditsSinceSavingRef,
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		latestSigRef,
		idleControllerRef,
		computeViewerCameraSigAction: computeViewerCameraSig,
		setSaveStateAction: setSaveState,
	});

	// Ensure that if we enter dirty state and controllers are ready, we schedule an idle save
	useEffect(() => {
		if (saveState.status !== "dirty") {
			return;
		}
		const ctl = idleControllerRef.current;
		if (!ctl) {
			return;
		}
		if (!(enabled && waId && isUnlocked)) {
			return;
		}
		if (!initialSceneAppliedRef.current) {
			return;
		}
		try {
			const elements = (latestElementsRef.current || []) as unknown[];
			const appState = (latestAppStateRef.current || {}) as Record<
				string,
				unknown
			>;
			const files = (latestFilesRef.current || {}) as Record<string, unknown>;
			const sig = (latestSigRef.current || "") as string;
			ctl.schedule?.({
				elements,
				appState,
				files,
				editorAppState: editorAppStateRef.current,
				sig,
			});
		} catch {
			// Intentional: scheduling may fail
		}
	}, [saveState.status, enabled, waId, isUnlocked, idleControllerRef.current]);

	// Apply external document updates via shared hook
	useDocumentsExternalUpdates({
		waId,
		onScene: (scene) => {
			try {
				lastLoadedWaIdRef.current = waId;
				const sig = computeDocumentSignature({
					elements: (scene?.elements as unknown[]) || [],
					appState: (scene?.appState as Record<string, unknown>) || {},
					files: (scene?.files as Record<string, unknown>) || {},
				});
				lastSavedSigRef.current = sig;
				if (
					scene?.editorAppState &&
					Object.keys(scene.editorAppState).length > 0
				) {
					const editorSig = computeViewerCameraSig(scene.editorAppState);
					lastSavedEditorSigRef.current = editorSig;
					editorAppStateRef.current = scene.editorAppState;
				} else {
					lastSavedEditorSigRef.current = null;
				}
				try {
					const ctl = idleControllerRef.current as unknown as {
						flushImmediate?: { lastSavedSig?: string };
					} | null;
					if (ctl?.flushImmediate) {
						ctl.flushImmediate.lastSavedSig = sig as string;
					}
				} catch {
					// Intentional: flush may fail
				}
				setSaveState({ status: "saved", at: Date.now() });
				try {
					startTransition(() => setLoading(false));
				} catch {
					// Intentional: start transition may fail
				}
				ignoreChangesUntilRef.current =
					Date.now() + EXTERNAL_SCENE_UPDATE_SUPPRESS_MS;
				initialSceneAppliedRef.current = true;
				// Start interval autosave if controller & API are ready
				try {
					const ctl = intervalControllerRef.current;
					const api = apiRef.current;
					if (ctl && api && !intervalStartedRef.current) {
						ctl.start?.({
							getElements: () => (api.getSceneElements?.() || []) as unknown[],
							getAppState: () =>
								(api.getAppState?.() || {}) as Record<string, unknown>,
							getFiles: () =>
								(api.getFiles?.() || {}) as Record<string, unknown>,
						});
						intervalStartedRef.current = true;
					}
				} catch {
					// Intentional: interval controller start may fail
				}
				// Deduped broadcast via central events process
				try {
					broadcastSceneApplied(
						waId,
						scene as unknown as Record<string, unknown>,
						sig
					);
				} catch {
					// Intentional: broadcast may fail
				}
			} catch {
				// Intentional: scene updates may fail
			}
		},
	});

	// Also consider the scene applied if we receive an explicit sceneApplied event
	useSceneAppliedListener({
		waId,
		initialSceneAppliedRef,
		ignoreChangesUntilRef,
	});

	const onExcalidrawAPI = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			apiRef.current = api;
			// Start interval autosave when API becomes available and scene is applied
			try {
				const ctl = intervalControllerRef.current;
				if (
					enabled &&
					waId &&
					isUnlocked &&
					initialSceneAppliedRef.current &&
					ctl &&
					!intervalStartedRef.current
				) {
					ctl.start?.({
						getElements: () => (api.getSceneElements?.() || []) as unknown[],
						getAppState: () =>
							(api.getAppState?.() || {}) as Record<string, unknown>,
						getFiles: () => (api.getFiles?.() || {}) as Record<string, unknown>,
					});
					intervalStartedRef.current = true;
				}
			} catch {
				// Intentional: interval controller start may fail
			}
		},
		[enabled, waId, isUnlocked, intervalControllerRef.current]
	);

	const saveStatus = useMemo(() => saveState, [saveState]);

	return {
		loading,
		handleCanvasChange,
		onExcalidrawAPI,
		saveStatus,
	} as const;
}
