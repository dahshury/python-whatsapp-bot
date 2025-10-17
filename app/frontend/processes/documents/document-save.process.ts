/*
 * Document save orchestration utilities
 * - Centralizes signature computation, normalization, idle debounced save, and interval autosave
 */

import { broadcastSceneApplied } from "@/processes/documents/document-events.process";
import { saveCustomerDocument } from "@/shared/libs/api/index";
import {
	computeSceneSignature,
	normalizeForPersist,
} from "@/shared/libs/documents/scene-utils";

// Constants
const SIG_DISPLAY_LENGTH = 40;
const SIG_DISPLAY_LENGTH_SHORT = 8;
const ZOOM_PRECISION_MULTIPLIER = 1000;
const DEBUG_ENABLED =
	typeof process !== "undefined" && process.env.NEXT_PUBLIC_DOCS_DEBUG === "1";

type Json = Record<string, unknown>;

// Debug logging helper (guarded by env flag)
function debugLog(..._args: unknown[]): void {
	try {
		if (DEBUG_ENABLED) {
			// Debug logging removed
		}
	} catch (_error) {
		// Silently ignore debug logging errors
	}
}
function debugWarn(..._args: unknown[]): void {
	try {
		if (DEBUG_ENABLED) {
			// Debug logging removed
		}
	} catch (_error) {
		// Silently ignore debug logging errors
	}
}

export type DocumentPayload = {
	waId: string;
	elements: unknown[];
	appState: Record<string, unknown>;
	files: Record<string, unknown>;
	editorAppState?: Record<string, unknown>;
};

export type SaveResult = {
	success: boolean;
	message?: string;
	[id: string]: unknown;
};

export function computeDocumentSignature(
	payload: Omit<DocumentPayload, "waId">
): string {
	try {
		return computeSceneSignature(
			payload.elements,
			payload.appState,
			payload.files
		);
	} catch {
		return "";
	}
}

export async function saveDocumentOnce(
	payload: DocumentPayload
): Promise<SaveResult> {
	try {
		// removed console logging
		const body = normalizeForPersist(
			payload.elements,
			payload.appState,
			payload.files,
			payload.editorAppState
		);
		const res = (await saveCustomerDocument({
			waId: payload.waId,
			document: body,
		})) as Json;
		// removed console logging
		return {
			success: Boolean((res as { success?: unknown })?.success) !== false,
			...res,
		} as SaveResult;
	} catch (e) {
		// removed console logging
		return { success: false, message: (e as Error)?.message } as SaveResult;
	}
}

export type IdleAutosaveControllerOptions = {
	waId: string;
	idleMs?: number; // default 3000
	/** Called right before a save attempt begins */
	onSaving?: (args: { waId: string }) => void;
	/** Optional fan-out after successful save */
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	/** Called when a save attempt fails */
	onError?: (args: { waId: string; message?: string }) => void;
};

export function createIdleAutosaveController(
	options: IdleAutosaveControllerOptions
) {
	const { waId, idleMs = 3000, onSaving, onSaved, onError } = options;
	let timer: number | null = null;
	let lastSavedSig: string | null = null;
	let lastPendingSig: string | null = null;

	function cancel(): void {
		if (timer) {
			window.clearTimeout(timer);
			timer = null;
			debugLog(
				`[autosave] ⛔ idle cancel: waId=${waId}, cleared timer (pendingSig was ${
					lastPendingSig
						? lastPendingSig.slice(0, SIG_DISPLAY_LENGTH)
						: "<none>"
				})`
			);
		}
		// Prevent late flush for previous waId
		lastPendingSig = null;
	}

	async function flush(
		payload: Omit<DocumentPayload, "waId"> & { sig?: string }
	): Promise<SaveResult | null> {
		const flushOptions: {
			payload: Omit<DocumentPayload, "waId"> & { sig?: string };
			waId: string;
			lastSavedSig: string | null;
			onSaving?: (args: { waId: string }) => void;
			onSaved?: (args: {
				waId: string;
				scene: Record<string, unknown>;
			}) => void;
			onError?: (args: { waId: string; message?: string }) => void;
			updateSig?: (sig: string) => void;
		} = {
			payload,
			waId,
			lastSavedSig,
			updateSig: (sig: string) => {
				lastSavedSig = sig;
			},
		};
		if (onSaving) {
			flushOptions.onSaving = onSaving;
		}
		if (onSaved) {
			flushOptions.onSaved = onSaved;
		}
		if (onError) {
			flushOptions.onError = onError;
		}
		return await flushDocument(flushOptions);
	}

	function schedule(
		payload: Omit<DocumentPayload, "waId"> & { sig?: string }
	): void {
		cancel();
		const contentSig = payload.sig || "";
		let editorSig = "";
		if (payload.editorAppState) {
			try {
				const zoomValue =
					(payload.editorAppState.zoom as { value?: number })?.value ?? 1;
				const scrollX = (payload.editorAppState.scrollX as number) ?? 0;
				const scrollY = (payload.editorAppState.scrollY as number) ?? 0;
				editorSig = JSON.stringify({
					zoom:
						Math.round(zoomValue * ZOOM_PRECISION_MULTIPLIER) /
						ZOOM_PRECISION_MULTIPLIER,
					scrollX: Math.round(scrollX),
					scrollY: Math.round(scrollY),
				});
			} catch (_error) {
				// Silently ignore editor signature computation errors
			}
		}
		lastPendingSig = `${contentSig}|editor:${editorSig}`;

		debugLog(
			`[autosave] 📅 idle schedule: waId=${waId}, pendingSig=${lastPendingSig.slice(
				0,
				SIG_DISPLAY_LENGTH
			)}..., lastSavedSig=${(lastSavedSig || "<none>").slice(0, SIG_DISPLAY_LENGTH)}..., will fire in ${idleMs}ms`
		);

		timer = window.setTimeout(() => {
			debugLog(
				`[autosave] ⏰ idle timer fired: waId=${waId}, pendingSig=${lastPendingSig}, lastSavedSig=${lastSavedSig}`
			);
			if (lastPendingSig && lastPendingSig !== lastSavedSig) {
				debugLog(`[autosave] 💾 idle flush starting: waId=${waId}`);
				flush({ ...payload, sig: contentSig });
			} else {
				debugLog(`[autosave] ⏭️ idle skip (no change): waId=${waId}`);
			}
		}, idleMs);
	}

	return { schedule, cancel, flushImmediate: flush } as const;
}

export type IntervalAutosaveControllerOptions = {
	waId: string;
	intervalMs?: number; // default 15000
	/** Called right before a save attempt begins (interval) */
	onSaving?: (args: { waId: string }) => void;
	/** Optional fan-out after successful save (interval) */
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	/** Called when a save attempt fails (interval) */
	onError?: (args: { waId: string; message?: string }) => void;
};

export function createIntervalAutosaveController(
	options: IntervalAutosaveControllerOptions
) {
	const { waId, intervalMs = 15_000, onSaving, onSaved, onError } = options;
	let id: number | null = null;
	let lastSavedSig: string | null = null;
	let lastVersion: number | null = null;
	// Preload and cache version function once per controller instance
	let getSceneVersionFn: null | ((els: readonly unknown[]) => number) = null;
	(async () => {
		try {
			// Prefer documented API if available; fallback to hashElementsVersion
			const mod = (await import("@excalidraw/excalidraw")) as unknown as {
				getSceneVersion?: (e: readonly unknown[]) => number;
				hashElementsVersion?: (e: readonly unknown[]) => number;
			};
			getSceneVersionFn =
				mod.getSceneVersion || mod.hashElementsVersion || null;
		} catch (_error) {
			// Silently ignore module import errors
		}
	})();

	function stop(): void {
		if (id) {
			window.clearInterval(id);
			id = null;
		}
		debugLog(`[autosave] ⛔ interval stopped: waId=${waId}`);
	}

	function start(getters: {
		getElements: () => unknown[];
		getAppState: () => Record<string, unknown>;
		getFiles: () => Record<string, unknown>;
	}): void {
		stop();
		id = window.setInterval(async () => {
			const autosaveOptions: {
				waId: string;
				intervalMs: number;
				getters: {
					getElements: () => unknown[];
					getAppState: () => Record<string, unknown>;
					getFiles: () => Record<string, unknown>;
				};
				getSceneVersionFn: null | ((els: readonly unknown[]) => number);
				lastSavedSig: string | null;
				lastVersion: number | null;
				onSaving?: (args: { waId: string }) => void;
				onSaved?: (args: {
					waId: string;
					scene: Record<string, unknown>;
				}) => void;
				onError?: (args: { waId: string; message?: string }) => void;
				updateStats?: (sig: string, version: number | null) => void;
			} = {
				waId,
				intervalMs,
				getters,
				getSceneVersionFn,
				lastSavedSig,
				lastVersion,
				updateStats: (sig: string, ver: number | null) => {
					lastSavedSig = sig;
					lastVersion = ver;
				},
			};
			if (onSaving) {
				autosaveOptions.onSaving = onSaving;
			}
			if (onSaved) {
				autosaveOptions.onSaved = onSaved;
			}
			if (onError) {
				autosaveOptions.onError = onError;
			}
			await processIntervalAutosave(autosaveOptions);
		}, intervalMs);
		debugLog(
			`[autosave] ▶️ interval started: waId=${waId}, every=${intervalMs}ms`
		);
	}

	return { start, stop } as const;
}

async function flushDocument(options: {
	payload: Omit<DocumentPayload, "waId"> & { sig?: string };
	waId: string;
	lastSavedSig: string | null;
	onSaving?: (args: { waId: string }) => void;
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	onError?: (args: { waId: string; message?: string }) => void;
	updateSig?: (sig: string) => void;
}): Promise<SaveResult | null> {
	const { payload, waId, lastSavedSig, onSaving, onSaved, onError, updateSig } =
		options;

	const contentSig = payload.sig || computeDocumentSignature(payload);
	const editorSig = computeEditorSignature(payload.editorAppState);
	const combinedSig = `${contentSig}|editor:${editorSig}`;

	debugLog(
		`[autosave] 🔍 flush check: waId=${waId}, combinedSig=${combinedSig.slice(
			0,
			SIG_DISPLAY_LENGTH
		)}..., lastSavedSig=${(lastSavedSig || "<none>").slice(0, SIG_DISPLAY_LENGTH)}...`
	);

	if (!combinedSig || combinedSig === lastSavedSig) {
		debugLog(`[autosave] ⏭️ flush skip (same sig): waId=${waId}`);
		return null;
	}

	debugLog(`[autosave] 💾 flush proceeding: waId=${waId}`);
	onSaving?.({ waId });
	const res = await saveDocumentOnce({ waId, ...payload });

	if (res?.success) {
		const successOptions: {
			waId: string;
			combinedSig: string;
			payload: Omit<DocumentPayload, "waId"> & { sig?: string };
			updateSig?: (sig: string) => void;
			onSaved?: (args: {
				waId: string;
				scene: Record<string, unknown>;
			}) => void;
		} = { waId, combinedSig, payload };
		if (updateSig) {
			successOptions.updateSig = updateSig;
		}
		if (onSaved) {
			successOptions.onSaved = onSaved;
		}
		handleFlushSuccess(successOptions);
	} else {
		const errorOptions: {
			waId: string;
			res: SaveResult;
			onError?: (args: { waId: string; message?: string }) => void;
		} = { waId, res };
		if (onError) {
			errorOptions.onError = onError;
		}
		handleFlushError(errorOptions);
	}

	return res;
}

function computeEditorSignature(
	editorAppState?: Record<string, unknown>
): string {
	if (!editorAppState) {
		return "";
	}
	try {
		const zoomValue = (editorAppState.zoom as { value?: number })?.value ?? 1;
		const scrollX = (editorAppState.scrollX as number) ?? 0;
		const scrollY = (editorAppState.scrollY as number) ?? 0;
		return JSON.stringify({
			zoom:
				Math.round(zoomValue * ZOOM_PRECISION_MULTIPLIER) /
				ZOOM_PRECISION_MULTIPLIER,
			scrollX: Math.round(scrollX),
			scrollY: Math.round(scrollY),
		});
	} catch (_error) {
		return "";
	}
}

function handleFlushSuccess(options: {
	waId: string;
	combinedSig: string;
	payload: Omit<DocumentPayload, "waId"> & { sig?: string };
	updateSig?: (sig: string) => void;
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
}): void {
	const { waId, combinedSig, payload, updateSig, onSaved } = options;

	updateSig?.(combinedSig);
	debugLog(`[autosave] ✅ flush success: waId=${waId}`);

	try {
		const g = globalThis as unknown as {
			__docLastSavedAt?: Record<string, number>;
		};
		g.__docLastSavedAt = g.__docLastSavedAt || {};
		g.__docLastSavedAt[waId] = Date.now();
	} catch (_error) {
		// Silently ignore global timestamp recording errors
	}

	try {
		const scene = normalizeForPersist(
			payload.elements,
			payload.appState,
			payload.files,
			payload.editorAppState
		) as Record<string, unknown>;
		onSaved?.({ waId, scene });
		broadcastSceneApplied(waId, scene, combinedSig);
	} catch (_error) {
		// Silently ignore scene broadcast errors
	}
}

function handleFlushError(options: {
	waId: string;
	res: SaveResult;
	onError?: (args: { waId: string; message?: string }) => void;
}): void {
	const { waId, res, onError } = options;

	try {
		const errorMessage = (res as { message?: string })?.message;
		if (errorMessage !== undefined) {
			onError?.({ waId, message: errorMessage });
		} else {
			onError?.({ waId });
		}
	} catch (_error) {
		// Silently ignore error callback invocation errors
	}
}

async function processIntervalAutosave(options: {
	waId: string;
	intervalMs: number;
	getters: {
		getElements: () => unknown[];
		getAppState: () => Record<string, unknown>;
		getFiles: () => Record<string, unknown>;
	};
	getSceneVersionFn: null | ((els: readonly unknown[]) => number);
	lastSavedSig: string | null;
	lastVersion: number | null;
	onSaving?: (args: { waId: string }) => void;
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	onError?: (args: { waId: string; message?: string }) => void;
	updateStats?: (sig: string, version: number | null) => void;
}): Promise<void> {
	const {
		waId,
		intervalMs,
		getters,
		getSceneVersionFn,
		lastSavedSig,
		lastVersion,
		onSaving,
		onSaved,
		onError,
		updateStats,
	} = options;

	try {
		if (shouldSkipThrottle(waId, intervalMs)) {
			return;
		}

		const elements = getters.getElements();
		const currentVersion = extractSceneVersion(elements, getSceneVersionFn);

		if (hasNoChanges(currentVersion, lastVersion)) {
			return;
		}

		const appState = getters.getAppState();
		const files = getters.getFiles();
		const sig = computeDocumentSignature({
			elements: elements as unknown as unknown[],
			appState: appState as unknown as Record<string, unknown>,
			files: files as unknown as Record<string, unknown>,
		});

		if (!shouldSaveWithSig(sig, lastSavedSig, waId)) {
			return;
		}

		debugLog(
			`[autosave] 💓 interval attempt: waId=${waId}, sig=${sig.slice(0, SIG_DISPLAY_LENGTH_SHORT)}`
		);

		try {
			onSaving?.({ waId });
		} catch (_error) {
			// Silently ignore onSaving callback errors
		}

		const res = await saveDocumentOnce({
			waId,
			elements,
			appState,
			files,
		});

		const baseArgs = {
			waId,
			sig,
			currentVersion,
		} as const;

		handleIntervalSaveResult(res, {
			...baseArgs,
			...(onSaved !== undefined && { onSaved }),
			...(onError !== undefined && { onError }),
			...(updateStats !== undefined && { updateStats }),
		});
	} catch (_error) {
		// Silently ignore interval loop errors
	}
}

function shouldSaveWithSig(
	sig: string,
	lastSavedSig: string | null,
	waId: string
): boolean {
	if (!sig || sig === lastSavedSig) {
		if (!sig) {
			debugLog(`[autosave] ⏭️ interval skip (empty sig): waId=${waId}`);
		}
		return false;
	}
	return true;
}

function handleIntervalSaveResult(
	res: SaveResult,
	options: {
		waId: string;
		sig: string;
		currentVersion: number | null;
		onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
		onError?: (args: { waId: string; message?: string }) => void;
		updateStats?: (sig: string, version: number | null) => void;
	}
): void {
	const { waId, sig, currentVersion, onSaved, onError, updateStats } = options;

	if ((res as { success?: boolean })?.success !== false) {
		const intervalSuccessOptions: {
			waId: string;
			sig: string;
			currentVersion: number | null;
			onSaved?: (args: {
				waId: string;
				scene: Record<string, unknown>;
			}) => void;
			updateStats?: (sig: string, version: number | null) => void;
		} = { waId, sig, currentVersion };
		if (onSaved) {
			intervalSuccessOptions.onSaved = onSaved;
		}
		if (updateStats) {
			intervalSuccessOptions.updateStats = updateStats;
		}
		handleIntervalSaveSuccess(intervalSuccessOptions);
	} else {
		const intervalErrorOptions: {
			waId: string;
			res: SaveResult;
			onError?: (args: { waId: string; message?: string }) => void;
		} = { waId, res };
		if (onError) {
			intervalErrorOptions.onError = onError;
		}
		handleIntervalSaveError(intervalErrorOptions);
	}
}

function shouldSkipThrottle(waId: string, intervalMs: number): boolean {
	try {
		const g = globalThis as unknown as {
			__docLastSavedAt?: Record<string, number>;
		};
		const lastAt = g.__docLastSavedAt?.[waId] || 0;
		if (lastAt && Date.now() - lastAt < intervalMs) {
			debugLog(
				`[autosave] ⏭️ interval skip (recent save ${Date.now() - lastAt}ms ago): waId=${waId}`
			);
			return true;
		}
	} catch (_error) {
		// Silently ignore throttle check errors
	}
	return false;
}

function extractSceneVersion(
	elements: unknown[],
	getSceneVersionFn: null | ((els: readonly unknown[]) => number)
): number | null {
	try {
		if (getSceneVersionFn) {
			return getSceneVersionFn(
				elements as unknown as readonly unknown[]
			) as unknown as number;
		}
	} catch (_error) {
		// Silently ignore version computation errors
	}
	return null;
}

function hasNoChanges(
	currentVersion: number | null,
	lastVersion: number | null
): boolean {
	return (
		currentVersion !== null &&
		lastVersion !== null &&
		currentVersion === lastVersion
	);
}

function handleIntervalSaveSuccess(options: {
	waId: string;
	sig: string;
	currentVersion: number | null;
	onSaved?: (args: { waId: string; scene: Record<string, unknown> }) => void;
	updateStats?: (sig: string, version: number | null) => void;
}): void {
	const { waId, sig, currentVersion, onSaved, updateStats } = options;

	updateStats?.(sig, currentVersion);

	try {
		const g = globalThis as unknown as {
			__docLastSavedAt?: Record<string, number>;
		};
		g.__docLastSavedAt = g.__docLastSavedAt || {};
		g.__docLastSavedAt[waId] = Date.now();
	} catch (_error) {
		// Silently ignore global timestamp recording errors
	}

	debugLog(
		`[autosave] ✅ interval success: waId=${waId}, sig=${sig.slice(0, SIG_DISPLAY_LENGTH_SHORT)}`
	);

	try {
		const sceneData = {} as Record<string, unknown>;
		onSaved?.({ waId, scene: sceneData });
	} catch (_error) {
		// Silently ignore scene broadcast errors
	}
}

function handleIntervalSaveError(options: {
	waId: string;
	res: SaveResult;
	onError?: (args: { waId: string; message?: string }) => void;
}): void {
	const { waId, res, onError } = options;

	debugWarn(
		`[autosave] ❌ interval failed: waId=${waId}, message=${(res as { message?: string })?.message || "unknown"}`
	);
	try {
		const errorMessage = (res as { message?: string })?.message;
		if (errorMessage !== undefined) {
			onError?.({ waId, message: errorMessage });
		} else {
			onError?.({ waId });
		}
	} catch (_error) {
		// Silently ignore error callback invocation errors
	}
}
