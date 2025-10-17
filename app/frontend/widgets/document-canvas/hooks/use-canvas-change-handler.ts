"use client";

import { useCallback, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
// NOTE: Avoid importing from @excalidraw/excalidraw at module scope to prevent SSR window access.
// We'll lazily load once on client and cache a synchronous getter.

const __getSceneVersionRef: {
	current: null | ((els: readonly unknown[]) => number);
} = { current: null };

function ensureSceneVersionLoaded() {
	if (typeof window === "undefined") {
		return;
	}
	if (__getSceneVersionRef.current) {
		return;
	}
	import("@excalidraw/excalidraw")
		.then((mod) => {
			try {
				const anyMod = mod as unknown as {
					getSceneVersion?: (e: readonly unknown[]) => number;
					hashElementsVersion?: (e: readonly unknown[]) => number;
				};
				__getSceneVersionRef.current = (anyMod.getSceneVersion ||
					anyMod.hashElementsVersion ||
					null) as (e: readonly unknown[]) => number;
			} catch {
				// Intentional: safe guard for dynamic import
			}
		})
		.catch(() => {
			// Intentional: excalidraw import may fail on SSR
		});
}

type JsonRecord = Record<string, unknown>;

type ChangeHandlerArgs = {
	elements?: unknown[];
	appState?: JsonRecord;
	files?: JsonRecord;
	editorAppState?: JsonRecord;
	sig?: string;
};

type UseCanvasChangeHandlerParams = {
	enabled: boolean;
	waId: string;
	isUnlocked: boolean;
	initialSceneAppliedRef: { current: boolean };
	ignoreChangesUntilRef: { current: number };
	editorAppStateRef: { current: JsonRecord };
	lastSavedEditorSigRef: { current: string | null };
	lastSavedSigRef: { current: string | null };
	lastScheduledSigRef: { current: string | null };
	isSavingRef: { current: boolean };
	hasLocalEditsSinceSavingRef: { current: boolean };
	latestElementsRef: { current: unknown[] | null };
	latestAppStateRef: { current: JsonRecord | null };
	latestFilesRef: { current: JsonRecord | null };
	latestSigRef: { current: string | null };
	idleControllerRef: {
		current: {
			schedule?: (payload: {
				elements: unknown[];
				appState: JsonRecord;
				files: JsonRecord;
				editorAppState?: JsonRecord;
				sig?: string;
			}) => void;
		} | null;
	};
	computeViewerCameraSigAction: (appState: JsonRecord) => string;
	setSaveStateAction: (
		v:
			| { status: "idle" }
			| { status: "dirty" }
			| { status: "saving" }
			| { status: "saved"; at: number }
			| { status: "error"; message?: string }
	) => void;
};

function updateLatestRefs(args: {
	latestElementsRef: { current: unknown[] | null };
	latestAppStateRef: { current: JsonRecord | null };
	latestFilesRef: { current: JsonRecord | null };
	elements: unknown[] | undefined;
	appState: JsonRecord | undefined;
	files: JsonRecord | undefined;
}) {
	const {
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		elements,
		appState,
		files,
	} = args;
	if (elements) {
		latestElementsRef.current = elements;
	}
	if (appState) {
		latestAppStateRef.current = appState;
	}
	if (files) {
		latestFilesRef.current = files;
	}
}

function computeSignature(
	sig: string | undefined,
	elements: unknown[] | undefined,
	editorCameraChanged: boolean
): string {
	let s: string = sig || "";
	try {
		const fn = __getSceneVersionRef.current;
		if (!s && typeof fn === "function" && !editorCameraChanged) {
			const version = fn(elements as unknown as readonly unknown[]);
			s = String(version);
		}
	} catch {
		// Intentional: scene version calculation may fail
	}
	return s;
}

function scheduleUpdate(args: {
	contentChanged: boolean;
	editorCameraChanged: boolean;
	s: string;
	elements: unknown[] | undefined;
	appState: JsonRecord | undefined;
	files: JsonRecord | undefined;
	latestElementsRef: { current: unknown[] | null };
	latestAppStateRef: { current: JsonRecord | null };
	latestFilesRef: { current: JsonRecord | null };
	lastScheduledSigRef: { current: string | null };
	editorAppStateRef: { current: JsonRecord };
	idleControllerRef: {
		current: {
			schedule?: (payload: {
				elements: unknown[];
				appState: JsonRecord;
				files: JsonRecord;
				editorAppState?: JsonRecord;
				sig?: string;
			}) => void;
		} | null;
	};
}) {
	const {
		contentChanged,
		editorCameraChanged,
		s,
		elements,
		appState,
		files,
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		lastScheduledSigRef,
		editorAppStateRef,
		idleControllerRef,
	} = args;

	const shouldSchedule =
		(contentChanged || editorCameraChanged) &&
		(s !== lastScheduledSigRef.current || editorCameraChanged);

	if (!shouldSchedule) {
		return;
	}

	lastScheduledSigRef.current = s || null;
	const effectiveSig = contentChanged ? s : "";
	const payloadElements =
		elements ?? ((latestElementsRef.current || []) as unknown[]);
	const payloadAppState = (appState ||
		latestAppStateRef.current ||
		{}) as JsonRecord;
	const payloadFiles = (files || latestFilesRef.current || {}) as JsonRecord;
	const ctl = idleControllerRef.current;
	if (!ctl) {
		return;
	}
	ctl.schedule?.({
		elements: payloadElements,
		appState: payloadAppState,
		files: payloadFiles,
		editorAppState: editorAppStateRef.current,
		sig: effectiveSig,
	});
}

function handleEditorCameraChange(
	editorAppState: JsonRecord | undefined,
	editorAppStateRef: { current: JsonRecord },
	lastSavedEditorSigRef: { current: string | null },
	computeViewerCameraSigAction: (appState: JsonRecord) => string
): boolean {
	if (!editorAppState) {
		return false;
	}
	const newEditorSig = computeViewerCameraSigAction(editorAppState);
	const changed = newEditorSig !== lastSavedEditorSigRef.current;
	editorAppStateRef.current = editorAppState;
	return changed;
}

function handleContentStateUpdate(args: {
	contentChanged: boolean;
	editorCameraChanged: boolean;
	s: string;
	elements: unknown[] | undefined;
	appState: JsonRecord | undefined;
	files: JsonRecord | undefined;
	latestElementsRef: { current: unknown[] | null };
	latestAppStateRef: { current: JsonRecord | null };
	latestFilesRef: { current: JsonRecord | null };
	lastScheduledSigRef: { current: string | null };
	editorAppStateRef: { current: JsonRecord };
	latestSigRef: { current: string | null };
	isSavingRef: { current: boolean };
	hasLocalEditsSinceSavingRef: { current: boolean };
	idleControllerRef: {
		current: {
			schedule?: (payload: {
				elements: unknown[];
				appState: JsonRecord;
				files: JsonRecord;
				editorAppState?: JsonRecord;
				sig?: string;
			}) => void;
		} | null;
	};
	setSaveStateAction: (
		v:
			| { status: "idle" }
			| { status: "dirty" }
			| { status: "saving" }
			| { status: "saved"; at: number }
			| { status: "error"; message?: string }
	) => void;
}): void {
	const {
		contentChanged,
		editorCameraChanged,
		s,
		elements,
		appState,
		files,
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		lastScheduledSigRef,
		editorAppStateRef,
		latestSigRef,
		isSavingRef,
		hasLocalEditsSinceSavingRef,
		idleControllerRef,
		setSaveStateAction,
	} = args;

	// Update latest refs
	updateLatestRefs({
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		elements,
		appState,
		files,
	});
	latestSigRef.current = s || null;

	if (isSavingRef.current) {
		hasLocalEditsSinceSavingRef.current = true;
	}

	// Mark dirty on content OR editor camera changes
	if ((contentChanged || editorCameraChanged) && !isSavingRef.current) {
		setSaveStateAction({ status: "dirty" });
	}

	// Schedule update if needed
	scheduleUpdate({
		contentChanged,
		editorCameraChanged,
		s,
		elements,
		appState,
		files,
		latestElementsRef,
		latestAppStateRef,
		latestFilesRef,
		lastScheduledSigRef,
		editorAppStateRef,
		idleControllerRef,
	});
}

export function useCanvasChangeHandler(params: UseCanvasChangeHandlerParams) {
	const {
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
		computeViewerCameraSigAction,
		setSaveStateAction,
	} = params;

	// Ensure the version helper is loaded once on mount (client only)
	useEffect(() => {
		ensureSceneVersionLoaded();
	}, []);

	/* biome-ignore lint/correctness/useExhaustiveDependencies: stable refs & callbacks; we intentionally omit .current-based deps */
	const handleCanvasChange = useCallback(
		(changeArgs: ChangeHandlerArgs) => {
			try {
				const {
					elements,
					appState,
					files,
					editorAppState,
					sig: initialSig,
				} = changeArgs;

				if (!(enabled && waId && isUnlocked)) {
					return;
				}
				if (!initialSceneAppliedRef.current) {
					return;
				}
				if (Date.now() < ignoreChangesUntilRef.current) {
					return;
				}

				// Only consider camera scroll movements for editor camera change
				const editorCameraChanged = handleEditorCameraChange(
					editorAppState,
					editorAppStateRef,
					lastSavedEditorSigRef,
					computeViewerCameraSigAction
				);

				// Compute signature
				const s = computeSignature(initialSig, elements, editorCameraChanged);
				const contentChanged = Boolean(s) && s !== lastSavedSigRef.current;

				handleContentStateUpdate({
					contentChanged,
					editorCameraChanged,
					s,
					elements,
					appState,
					files,
					latestElementsRef,
					latestAppStateRef,
					latestFilesRef,
					lastScheduledSigRef,
					editorAppStateRef,
					latestSigRef,
					isSavingRef,
					hasLocalEditsSinceSavingRef,
					idleControllerRef,
					setSaveStateAction,
				});
			} catch {
				// Intentional: ignore change handler errors
			}
		},
		[enabled, waId, isUnlocked]
	);

	return (
		elements?: unknown[],
		appState?: JsonRecord,
		files?: JsonRecord,
		editorAppState?: JsonRecord
	) =>
		handleCanvasChange({
			elements: elements ?? [],
			appState: appState ?? {},
			files: files ?? {},
			editorAppState: editorAppState ?? {},
		});
}
