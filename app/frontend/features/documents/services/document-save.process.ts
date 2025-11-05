import { CameraState, SceneSignature } from "@/entities/document";
import {
  computeSceneSignature,
  normalizeForPersist,
} from "@/shared/libs/documents/scene-utils";

type Json = Record<string, unknown>;

// Throttle delay to prevent duplicate saves within 1 second
const SAVE_THROTTLE_MS = 1000;

export type DocumentPayload = {
  waId: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  viewerAppState?: Record<string, unknown>;
  editorAppState?: Record<string, unknown>;
};

export type SaveResult = {
  success: boolean;
  message?: string;
  [id: string]: unknown;
};

export type SaveMutationFn = (args: {
  waId: string;
  snapshot: Partial<{
    name?: string | null;
    age?: number | null;
    document?: unknown;
  }>;
}) => Promise<boolean>;

/**
 * Computes a document signature from payload.
 * Uses domain value objects for consistency.
 */
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

/**
 * Computes combined signature including content + camera states.
 * Uses domain value objects for camera state parsing.
 */
function computeCombinedSignature(
  payload: Omit<DocumentPayload, "waId"> & { sig?: string }
): string {
  const viewerCamera = payload.viewerAppState
    ? CameraState.fromViewerState(payload.viewerAppState)
    : CameraState.createDefault();

  const editorCamera = payload.editorAppState
    ? CameraState.fromViewerState(payload.editorAppState)
    : CameraState.createDefault();

  return SceneSignature.computeWithCamera({
    elements: payload.elements,
    appState: payload.appState,
    files: payload.files,
    viewerCamera,
    editorCamera,
  }).toString();
}

export async function saveDocumentOnce(
  payload: DocumentPayload,
  saveMutationFn: SaveMutationFn
): Promise<SaveResult> {
  try {
    const body = normalizeForPersist({
      elements: payload.elements,
      appState: payload.appState,
      files: payload.files,
      ...(payload.viewerAppState !== undefined && {
        viewerAppState: payload.viewerAppState,
      }),
      ...(payload.editorAppState !== undefined && {
        editorAppState: payload.editorAppState,
      }),
    });
    const ok = await saveMutationFn({
      waId: payload.waId,
      snapshot: { document: body },
    });
    const res = { success: ok } as Json;
    return {
      success: Boolean((res as { success?: unknown })?.success) !== false,
      ...res,
    } as SaveResult;
  } catch (e) {
    return { success: false, message: (e as Error)?.message } as SaveResult;
  }
}

export type IdleAutosaveControllerOptions = {
  waId: string;
  idleMs?: number;
  saveMutationFn: SaveMutationFn;
  onSaving?: (args: { waId: string; signature: SceneSignature }) => void;
  onSaved?: (args: {
    waId: string;
    scene: Record<string, unknown>;
    signatureBeingSaved: SceneSignature;
    currentSignature: SceneSignature | null;
  }) => void;
  onError?: (args: { waId: string; message?: string }) => void;
  getLastSavedCombinedSignature: () => SceneSignature | null;
  getCurrentCombinedSignature: (
    payload: Omit<DocumentPayload, "waId"> & { sig?: string }
  ) => SceneSignature | null;
};

export function createIdleAutosaveController(
  options: IdleAutosaveControllerOptions
) {
  const {
    waId,
    idleMs = 3000,
    saveMutationFn,
    onSaving,
    onSaved,
    onError,
    getLastSavedCombinedSignature,
    getCurrentCombinedSignature,
  } = options;
  let timer: number | null = null;
  let pendingPayload:
    | (Omit<DocumentPayload, "waId"> & { sig?: string })
    | null = null;

  function cancel(): void {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
    pendingPayload = null;
  }

  async function flush(
    payload: Omit<DocumentPayload, "waId"> & { sig?: string },
    getLastSavedSig: () => SceneSignature | null,
    getCurrentSig: (
      payloadToCheck: Omit<DocumentPayload, "waId"> & { sig?: string }
    ) => SceneSignature | null
  ): Promise<SaveResult | null> {
    const combinedSig = computeCombinedSignature(payload);
    if (!combinedSig) {
      return null;
    }

    // Check with the external signature tracker if this was already saved
    // The external tracker is the source of truth
    const lastSavedSig = getLastSavedSig();
    if (lastSavedSig && combinedSig === lastSavedSig.toString()) {
      return null;
    }

    const signatureBeingSaved = SceneSignature.fromString(combinedSig);
    onSaving?.({ waId, signature: signatureBeingSaved });
    const res = await saveDocumentOnce({ waId, ...payload }, saveMutationFn);
    if (res?.success) {
      try {
        const g = globalThis as unknown as {
          __docLastSavedAt?: Record<string, number>;
        };
        g.__docLastSavedAt = g.__docLastSavedAt || {};
        g.__docLastSavedAt[waId] = Date.now();
      } catch {
        // Silently ignore errors
      }
      try {
        const scene = normalizeForPersist({
          elements: payload.elements,
          appState: payload.appState,
          files: payload.files,
          ...(payload.viewerAppState !== undefined && {
            viewerAppState: payload.viewerAppState,
          }),
          ...(payload.editorAppState !== undefined && {
            editorAppState: payload.editorAppState,
          }),
        }) as Record<string, unknown>;
        // Get current signature to check for changes during save
        const currentSignature = getCurrentSig(payload);
        onSaved?.({ waId, scene, signatureBeingSaved, currentSignature });
        window.dispatchEvent(
          new CustomEvent("documents:sceneApplied", {
            detail: { wa_id: waId, scene },
          })
        );
      } catch {
        // Silently ignore errors
      }
    } else {
      try {
        const message = (res as { message?: string })?.message;
        onError?.({ waId, ...(message ? { message } : {}) });
      } catch {
        // Silently ignore errors
      }
    }
    return res;
  }

  function schedule(
    payload: Omit<DocumentPayload, "waId"> & { sig?: string }
  ): void {
    cancel();
    pendingPayload = payload;

    timer = window.setTimeout(() => {
      const payloadToSave = pendingPayload;
      if (payloadToSave) {
        flush(
          payloadToSave,
          getLastSavedCombinedSignature,
          getCurrentCombinedSignature
        ).catch(() => {
          // Errors handled in flush (accessing outer scope variables)
        });
      }
      pendingPayload = null;
    }, idleMs);
  }

  function flushImmediate(
    payload: Omit<DocumentPayload, "waId"> & { sig?: string }
  ): Promise<SaveResult | null> {
    return flush(
      payload,
      getLastSavedCombinedSignature,
      getCurrentCombinedSignature
    );
  }

  return { schedule, cancel, flushImmediate } as const;
}

export type IntervalAutosaveControllerOptions = {
  waId: string;
  intervalMs?: number;
  saveMutationFn: SaveMutationFn;
  onSaving?: (args: { waId: string; signature: SceneSignature }) => void;
  onSaved?: (args: {
    waId: string;
    scene: Record<string, unknown>;
    signatureBeingSaved: SceneSignature;
    currentSignature: SceneSignature | null;
  }) => void;
  onError?: (args: { waId: string; message?: string }) => void;
};

export function createIntervalAutosaveController(
  options: IntervalAutosaveControllerOptions
) {
  const {
    waId,
    intervalMs = 15_000,
    saveMutationFn,
    onSaving,
    onSaved,
    onError,
  } = options;
  let id: number | null = null;

  function stop(): void {
    if (id) {
      window.clearInterval(id);
      id = null;
    }
  }

  function start(getters: {
    getElements: () => unknown[];
    getAppState: () => Record<string, unknown>;
    getFiles: () => Record<string, unknown>;
    getViewerAppState?: () => Record<string, unknown> | undefined;
    getEditorAppState?: () => Record<string, unknown> | undefined;
    getCurrentSignature: () => SceneSignature | null;
    hasRecentActivity: (windowMs: number) => boolean;
  }): void {
    stop();
    id = window.setInterval(async () => {
      try {
        // Only save if there's been recent activity (continuous activity mode)
        // If no activity in the last interval period, skip this save
        if (!getters.hasRecentActivity(intervalMs)) {
          return;
        }

        // Check global flag to avoid saving too soon after idle save
        try {
          const g = globalThis as unknown as {
            __docLastSavedAt?: Record<string, number>;
          };
          const lastAt = g.__docLastSavedAt?.[waId] || 0;
          // Don't save if we saved less than 1 second ago (avoid double saves)
          if (lastAt && Date.now() - lastAt < SAVE_THROTTLE_MS) {
            return;
          }
        } catch {
          // Silently ignore errors
        }

        const elements = getters.getElements();
        const appState = getters.getAppState();
        const files = getters.getFiles();
        const viewerAppState = getters.getViewerAppState?.();
        const editorAppState = getters.getEditorAppState?.();

        // Compute current signature (content only for interval saves)
        const currentSig = SceneSignature.compute(elements, appState, files);
        const savedSig = getters.getCurrentSignature();

        // Only save if content has actually changed
        if (!savedSig || currentSig.equalsSignature(savedSig)) {
          return;
        }

        onSaving?.({ waId, signature: currentSig });
        const res = await saveDocumentOnce(
          {
            waId,
            elements,
            appState,
            files,
            ...(viewerAppState !== undefined && { viewerAppState }),
            ...(editorAppState !== undefined && { editorAppState }),
          },
          saveMutationFn
        );
        if ((res as { success?: boolean })?.success !== false) {
          try {
            const g = globalThis as unknown as {
              __docLastSavedAt?: Record<string, number>;
            };
            g.__docLastSavedAt = g.__docLastSavedAt || {};
            g.__docLastSavedAt[waId] = Date.now();
          } catch {
            // Silently ignore errors
          }
          try {
            const scene = normalizeForPersist({
              elements,
              appState,
              files,
              ...(viewerAppState !== undefined && {
                viewerAppState,
              }),
              ...(editorAppState !== undefined && {
                editorAppState,
              }),
            }) as Record<string, unknown>;
            // Get current signature after save (may have changed during save)
            const currentElements = getters.getElements();
            const currentAppState = getters.getAppState();
            const currentFiles = getters.getFiles();
            const currentSignature = SceneSignature.compute(
              currentElements,
              currentAppState,
              currentFiles
            );
            onSaved?.({
              waId,
              scene,
              signatureBeingSaved: currentSig,
              currentSignature,
            });
            window.dispatchEvent(
              new CustomEvent("documents:sceneApplied", {
                detail: { wa_id: waId, scene },
              })
            );
          } catch {
            // Silently ignore errors
          }
        } else {
          try {
            const message = (res as { message?: string })?.message;
            onError?.({ waId, ...(message ? { message } : {}) });
          } catch {
            // Silently ignore errors
          }
        }
      } catch {
        // Silently ignore errors in interval
      }
    }, intervalMs);
  }

  return { start, stop } as const;
}
