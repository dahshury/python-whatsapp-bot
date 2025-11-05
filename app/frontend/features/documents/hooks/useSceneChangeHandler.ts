import { useCallback, useRef } from "react";
import type { CameraState } from "@/entities/document";
import { SceneSignature } from "@/entities/document";
import {
  AutosaveOrchestrationService,
  type AutosaveState,
} from "../services/autosave-orchestration.service";
import { SceneChangeDetectionService } from "../services/scene-change-detection.service";

export type SceneChangePayload = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  viewerAppState?: Record<string, unknown> | undefined;
  editorAppState?: Record<string, unknown> | undefined;
  sig?: string | undefined;
};

export type UseSceneChangeHandlerOptions = {
  enabled: boolean;
  waId: string;
  isUnlocked: boolean;
  initialSceneApplied: boolean;
  ignoreChangesUntil: number;
  autosaveStateRef: React.RefObject<AutosaveState>;
  lastSavedSignatureRef: React.RefObject<SceneSignature | null>;
  lastSavedViewerCameraRef: React.RefObject<CameraState | null>;
  lastSavedEditorCameraRef: React.RefObject<CameraState | null>;
  idleControllerRef: React.RefObject<{
    schedule: (payload: SceneChangePayload) => void;
  } | null>;
  onStateChange: (status: "dirty") => void;
};

/**
 * Hook for handling canvas scene changes.
 * Detects changes, schedules autosave, and manages change state.
 *
 * @param options - Configuration and refs
 * @returns Canvas change handler
 *
 * @example
 * ```typescript
 * const { handleCanvasChange } = useSceneChangeHandler({
 *   enabled,
 *   waId,
 *   isUnlocked,
 *   initialSceneApplied,
 *   autosaveStateRef,
 *   lastSavedSignatureRef,
 *   onStateChange: (status) => setSaveState({ status })
 * })
 * ```
 */
export const useSceneChangeHandler = (
  options: UseSceneChangeHandlerOptions
) => {
  const {
    enabled,
    waId,
    isUnlocked,
    initialSceneApplied,
    ignoreChangesUntil,
    autosaveStateRef,
    lastSavedSignatureRef,
    lastSavedViewerCameraRef,
    lastSavedEditorCameraRef,
    idleControllerRef,
    onStateChange,
  } = options;

  // Keep track of latest camera states
  const viewerAppStateRef = useRef<Record<string, unknown>>({});
  const editorAppStateRef = useRef<Record<string, unknown>>({});

  const handleCanvasChange = useCallback(
    (payload: SceneChangePayload) => {
      const { elements, appState, files, viewerAppState, editorAppState, sig } =
        payload;
      try {
        // Early exits for disabled states
        if (!(enabled && waId && isUnlocked)) {
          return;
        }
        if (!initialSceneApplied) {
          return;
        }
        if (Date.now() < ignoreChangesUntil) {
          return;
        }

        // Update camera state refs
        if (viewerAppState) {
          viewerAppStateRef.current = viewerAppState;
        }
        if (editorAppState) {
          editorAppStateRef.current = editorAppState;
        }

        // Detect all types of changes
        const changeResult = SceneChangeDetectionService.detectChanges({
          elements,
          appState,
          files,
          lastSavedSignature: lastSavedSignatureRef.current,
          lastSavedViewerCamera: lastSavedViewerCameraRef.current,
          lastSavedEditorCamera: lastSavedEditorCameraRef.current,
          viewerAppState: viewerAppState || undefined,
          editorAppState: editorAppState || undefined,
        });

        // Record activity and local edit if saving
        if (changeResult.hasAnyChanges) {
          if (autosaveStateRef.current.isSaving) {
            AutosaveOrchestrationService.recordLocalEdit(
              autosaveStateRef.current,
              changeResult.signature
            );
          } else {
            // Record activity for continuous activity tracking
            AutosaveOrchestrationService.recordActivity(
              autosaveStateRef.current
            );
          }
        }

        // Update UI state if there are changes and not saving
        if (changeResult.hasAnyChanges && !autosaveStateRef.current.isSaving) {
          onStateChange("dirty");
        }

        // Determine if we should schedule a save
        const hasCameraChanges =
          changeResult.hasViewerCameraChanges ||
          changeResult.hasEditorCameraChanges;

        // Always compute combined signature for comparison and scheduling
        // This ensures camera changes are properly detected and scheduled
        const combinedSignature = SceneSignature.computeWithCamera({
          elements,
          appState,
          files,
          ...(changeResult.viewerCamera && {
            viewerCamera: changeResult.viewerCamera,
          }),
          ...(changeResult.editorCamera && {
            editorCamera: changeResult.editorCamera,
          }),
        });

        const shouldSchedule = AutosaveOrchestrationService.shouldScheduleSave({
          state: autosaveStateRef.current,
          newSignature: changeResult.signature,
          combinedSignature,
          hasContentChanges: changeResult.hasContentChanges,
          hasCameraChanges,
          idleTimeoutMs: 3000, // Only schedule idle save if no activity in last 3 seconds
        });

        // Schedule save if needed
        if (shouldSchedule && idleControllerRef.current) {
          idleControllerRef.current.schedule({
            elements,
            appState,
            files,
            viewerAppState: viewerAppStateRef.current,
            editorAppState: editorAppStateRef.current,
            sig: sig || combinedSignature.toString(),
          });
        }
      } catch {
        // Silently ignore errors
      }
    },
    [
      enabled,
      waId,
      isUnlocked,
      initialSceneApplied,
      ignoreChangesUntil,
      autosaveStateRef,
      lastSavedSignatureRef,
      lastSavedViewerCameraRef,
      lastSavedEditorCameraRef,
      idleControllerRef,
      onStateChange,
    ]
  );

  return {
    handleCanvasChange,
    viewerAppStateRef,
    editorAppStateRef,
  } as const;
};
