import { useEffect, useRef } from "react";
import { CameraState, SceneSignature } from "@/entities/document";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";

const IGNORE_CHANGES_DELAY_MS = 800;

import {
  AutosaveOrchestrationService,
  type AutosaveState,
} from "../services/autosave-orchestration.service";
import {
  createIdleAutosaveController,
  createIntervalAutosaveController,
} from "../services/document-save.process";
import type { ExcalidrawAPI } from "./useExcalidrawAPI";

export type AutosaveCallbacks = {
  onSaving: () => void;
  onSaved: (signature: SceneSignature) => void;
  onError: (message?: string) => void;
};

export type UseAutosaveControllersOptions = {
  waId: string;
  enabled: boolean;
  isUnlocked: boolean;
  initialSceneApplied: boolean;
  apiRef: React.RefObject<ExcalidrawAPI | null>;
  autosaveStateRef: React.RefObject<AutosaveState>;
  lastSavedSignatureRef: React.RefObject<SceneSignature | null>;
  lastSavedViewerCameraRef: React.RefObject<CameraState | null>;
  lastSavedEditorCameraRef: React.RefObject<CameraState | null>;
  ignoreChangesUntilRef: React.RefObject<number>;
  callbacks: AutosaveCallbacks;
  saveMutationFn: (args: {
    waId: string;
    snapshot: Partial<{
      name?: string | null;
      age?: number | null;
      document?: unknown;
    }>;
  }) => Promise<boolean>;
};

/**
 * Hook for managing autosave controllers (idle and interval based).
 * Handles controller lifecycle, save callbacks, and state synchronization.
 *
 * @param options - Configuration and callbacks
 *
 * @example
 * ```typescript
 * useAutosaveControllers({
 *   waId,
 *   enabled,
 *   isUnlocked,
 *   apiRef,
 *   callbacks: { onSaving, onSaved, onError }
 * })
 * ```
 */
export const useAutosaveControllers = (
  options: UseAutosaveControllersOptions
) => {
  const {
    waId,
    enabled,
    isUnlocked,
    initialSceneApplied,
    apiRef,
    autosaveStateRef,
    lastSavedSignatureRef,
    lastSavedViewerCameraRef,
    lastSavedEditorCameraRef,
    ignoreChangesUntilRef,
    callbacks,
    saveMutationFn,
  } = options;

  const idleControllerRef = useRef<ReturnType<
    typeof createIdleAutosaveController
  > | null>(null);

  const intervalControllerRef = useRef<ReturnType<
    typeof createIntervalAutosaveController
  > | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        idleControllerRef.current?.cancel();
      } catch {
        // Silently ignore cleanup errors
      }
      try {
        intervalControllerRef.current?.stop();
      } catch {
        // Silently ignore cleanup errors
      }
    };
  }, []);

  // Initialize controllers when waId changes
  useEffect(() => {
    if (!waId) {
      return;
    }

    // Create idle autosave controller
    idleControllerRef.current = createIdleAutosaveController({
      waId,
      idleMs: 3000,
      saveMutationFn,
      getLastSavedCombinedSignature: () => {
        // Get the last saved combined signature for comparison
        const contentSig = lastSavedSignatureRef.current;
        if (!contentSig) {
          return null;
        }
        const viewerCam = lastSavedViewerCameraRef.current;
        const editorCam = lastSavedEditorCameraRef.current;
        return SceneSignature.computeWithCamera({
          elements: [],
          appState: {},
          files: {},
          ...(viewerCam && { viewerCamera: viewerCam }),
          ...(editorCam && { editorCamera: editorCam }),
        });
      },
      getCurrentCombinedSignature: (payload) => {
        // Compute current combined signature from payload
        const viewerCamera = payload.viewerAppState
          ? CameraState.fromViewerState(payload.viewerAppState)
          : null;
        const editorCamera = payload.editorAppState
          ? CameraState.fromViewerState(payload.editorAppState)
          : null;
        return SceneSignature.computeWithCamera({
          elements: payload.elements,
          appState: payload.appState,
          files: payload.files,
          ...(viewerCamera && { viewerCamera }),
          ...(editorCamera && { editorCamera }),
        });
      },
      onSaving: ({ signature }) => {
        AutosaveOrchestrationService.markSavingStart(
          autosaveStateRef.current,
          signature
        );
        callbacks.onSaving();
      },
      onSaved: (args) => {
        const { scene, signatureBeingSaved, currentSignature } = args;

        // Update last saved signature (content only)
        const sig = computeSceneSignature(
          (scene.elements || []) as unknown[],
          (scene.appState || {}) as Record<string, unknown>,
          (scene.files || {}) as Record<string, unknown>
        );

        if (sig) {
          lastSavedSignatureRef.current = SceneSignature.fromString(sig);
        }

        // Update camera states from saved scene
        const viewerState = (scene.viewerAppState || {}) as Record<
          string,
          unknown
        >;
        if (viewerState && Object.keys(viewerState).length > 0) {
          lastSavedViewerCameraRef.current =
            CameraState.fromViewerState(viewerState);
        }

        const editorState = (scene.editorAppState || {}) as Record<
          string,
          unknown
        >;
        if (editorState && Object.keys(editorState).length > 0) {
          lastSavedEditorCameraRef.current =
            CameraState.fromViewerState(editorState);
        }

        // Mark saving complete and check for pending changes
        AutosaveOrchestrationService.markSavingComplete(
          autosaveStateRef.current,
          signatureBeingSaved,
          currentSignature
        );

        // Update the saved signature to match what was actually saved
        // Use content signature (without camera) as the saved signature
        const savedContentSig = lastSavedSignatureRef.current;
        if (savedContentSig) {
          callbacks.onSaved(savedContentSig);
        }

        // Set ignore changes delay
        ignoreChangesUntilRef.current = Date.now() + IGNORE_CHANGES_DELAY_MS;
      },
      onError: ({ message }) => {
        autosaveStateRef.current.isSaving = false;
        autosaveStateRef.current.lastScheduledSignature = null;
        autosaveStateRef.current.pendingSaveSignature = null;
        AutosaveOrchestrationService.setGlobalSavingFlag(false);
        callbacks.onError(message);
      },
    });

    // Create interval autosave controller
    intervalControllerRef.current = createIntervalAutosaveController({
      waId,
      intervalMs: 15_000,
      saveMutationFn,
      onSaving: ({ signature }) => {
        AutosaveOrchestrationService.markSavingStart(
          autosaveStateRef.current,
          signature
        );
        callbacks.onSaving();
      },
      onSaved: (args) => {
        const { scene, signatureBeingSaved, currentSignature } = args;

        // Update last saved signature (content only)
        const sig = computeSceneSignature(
          (scene.elements || []) as unknown[],
          (scene.appState || {}) as Record<string, unknown>,
          (scene.files || {}) as Record<string, unknown>
        );

        if (sig) {
          lastSavedSignatureRef.current = SceneSignature.fromString(sig);
        }

        // Update camera states from saved scene
        const viewerState = (scene.viewerAppState || {}) as Record<
          string,
          unknown
        >;
        if (viewerState && Object.keys(viewerState).length > 0) {
          lastSavedViewerCameraRef.current =
            CameraState.fromViewerState(viewerState);
        }

        const editorState = (scene.editorAppState || {}) as Record<
          string,
          unknown
        >;
        if (editorState && Object.keys(editorState).length > 0) {
          lastSavedEditorCameraRef.current =
            CameraState.fromViewerState(editorState);
        }

        // Mark saving complete and check for pending changes
        AutosaveOrchestrationService.markSavingComplete(
          autosaveStateRef.current,
          signatureBeingSaved,
          currentSignature
        );

        // Update the saved signature to match what was actually saved
        const savedContentSig = lastSavedSignatureRef.current;
        if (savedContentSig) {
          callbacks.onSaved(savedContentSig);
        }

        ignoreChangesUntilRef.current = Date.now() + IGNORE_CHANGES_DELAY_MS;
      },
      onError: ({ message }) => {
        autosaveStateRef.current.isSaving = false;
        autosaveStateRef.current.lastScheduledSignature = null;
        autosaveStateRef.current.pendingSaveSignature = null;
        AutosaveOrchestrationService.setGlobalSavingFlag(false);
        callbacks.onError(message);
      },
    });

    return () => {
      try {
        idleControllerRef.current?.cancel();
      } catch {
        // Silently ignore errors
      }
      try {
        intervalControllerRef.current?.stop();
      } catch {
        // Silently ignore errors
      }
    };
  }, [
    waId,
    autosaveStateRef,
    lastSavedSignatureRef,
    callbacks,
    ignoreChangesUntilRef,
    lastSavedEditorCameraRef,
    lastSavedViewerCameraRef,
    saveMutationFn,
  ]);

  // Start interval controller when conditions are met
  useEffect(() => {
    const ctl = intervalControllerRef.current;
    const api = apiRef.current as unknown as {
      getSceneElementsIncludingDeleted?: () => unknown[];
      getAppState?: () => Record<string, unknown>;
      getFiles?: () => Record<string, unknown>;
    } | null;

    if (!(enabled && waId && isUnlocked && initialSceneApplied && ctl && api)) {
      // Return empty cleanup function when autosave is not enabled
      return () => {
        // No-op cleanup for disabled state
      };
    }

    ctl.start({
      getElements: () =>
        (api?.getSceneElementsIncludingDeleted?.() || []) as unknown[],
      getAppState: () =>
        (api?.getAppState?.() || {}) as Record<string, unknown>,
      getFiles: () => (api?.getFiles?.() || {}) as Record<string, unknown>,
      getViewerAppState: () => {
        // Interval controller doesn't need viewer/editor camera for content saves
        // biome-ignore lint/nursery/noUselessUndefined: Required for TypeScript type compatibility
        return undefined;
      },
      getEditorAppState: () => {
        // Interval controller doesn't need viewer/editor camera for content saves
        // biome-ignore lint/nursery/noUselessUndefined: Required for TypeScript type compatibility
        return undefined;
      },
      getCurrentSignature: () => {
        // Return content-only signature (camera changes are handled by idle controller)
        return lastSavedSignatureRef.current;
      },
      hasRecentActivity: (windowMs: number) =>
        AutosaveOrchestrationService.hasRecentActivity(
          autosaveStateRef.current,
          windowMs
        ),
    });

    return () => ctl.stop();
  }, [
    enabled,
    waId,
    isUnlocked,
    initialSceneApplied,
    apiRef,
    autosaveStateRef,
    lastSavedSignatureRef,
  ]);

  return {
    idleControllerRef,
    intervalControllerRef,
  } as const;
};
