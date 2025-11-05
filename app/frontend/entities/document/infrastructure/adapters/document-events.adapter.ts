import { toSceneFromDoc } from "@/shared/libs/documents";
import type { DocumentScene } from "../../types/scene.types";
import { CameraState } from "../../value-objects/camera-state.vo";
import { SceneSignature } from "../../value-objects/scene-signature.vo";

/**
 * Event data emitted when an external document update occurs.
 * Contains the parsed scene data with domain objects.
 */
export type DocumentExternalUpdateEvent = {
  waId: string;
  scene: DocumentScene;
  signature: SceneSignature;
  viewerCamera?: CameraState | undefined;
  editorCamera?: CameraState | undefined;
};

/**
 * Event data emitted when a scene is successfully applied.
 */
export type DocumentSceneAppliedEvent = {
  waId: string;
  scene: Record<string, unknown>;
};

/**
 * Adapter for document-related WebSocket and DOM events.
 * Abstracts browser event handling and provides domain-friendly interfaces.
 *
 * @example
 * ```typescript
 * // Listen for external updates
 * const unsubscribe = DocumentEventsAdapter.onExternalUpdate(waId, (event) => {
 *   console.log('Scene updated:', event.signature)
 * })
 *
 * // Dispatch scene applied event
 * DocumentEventsAdapter.dispatchSceneApplied(waId, sceneData)
 * ```
 */
export const DocumentEventsAdapter = {
  /**
   * Subscribes to external document updates for a specific WhatsApp ID.
   * Converts raw event data to domain objects.
   *
   * @param waId - WhatsApp ID to filter events for
   * @param handler - Callback to handle the update event
   * @returns Cleanup function to unsubscribe
   */
  onExternalUpdate: (
    waId: string,
    handler: (event: DocumentExternalUpdateEvent) => void
  ): (() => void) => {
    const eventHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          wa_id?: string;
          document?: Record<string, unknown> | null;
        };
        const target = String(detail?.wa_id || "");
        if (!target || target !== waId) {
          return;
        }

        const doc = detail?.document || null;
        const scene = toSceneFromDoc(doc as Record<string, unknown> | null);

        const signature = SceneSignature.compute(
          scene.elements,
          scene.appState,
          scene.files
        );

        const viewerCamera = scene.viewerAppState
          ? CameraState.fromViewerState(scene.viewerAppState)
          : undefined;

        const editorCamera = scene.editorAppState
          ? CameraState.fromViewerState(scene.editorAppState)
          : undefined;

        handler({
          waId,
          scene,
          signature,
          viewerCamera,
          editorCamera,
        });
      } catch (_error) {
        // Silently ignore errors in event handler
      }
    };

    window.addEventListener(
      "documents:external-update",
      eventHandler as EventListener
    );
    return () =>
      window.removeEventListener(
        "documents:external-update",
        eventHandler as EventListener
      );
  },

  /**
   * Subscribes to scene applied events for a specific WhatsApp ID.
   * Fired after a scene is successfully loaded/applied to the canvas.
   *
   * @param waId - WhatsApp ID to filter events for
   * @param handler - Callback to handle the event
   * @returns Cleanup function to unsubscribe
   */
  onSceneApplied: (
    waId: string,
    handler: (event: DocumentSceneAppliedEvent) => void
  ): (() => void) => {
    const eventHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as {
          wa_id?: string;
          scene?: Record<string, unknown> | null;
        };
        if (String(detail?.wa_id || "") !== waId) {
          return;
        }

        handler({
          waId,
          scene: detail?.scene || {},
        });
      } catch (_error) {
        // Silently ignore errors in event handler
      }
    };

    window.addEventListener(
      "documents:sceneApplied",
      eventHandler as EventListener
    );
    return () =>
      window.removeEventListener(
        "documents:sceneApplied",
        eventHandler as EventListener
      );
  },

  /**
   * Dispatches a scene applied event to notify listeners.
   * Used after successfully loading/saving a scene.
   *
   * @param waId - WhatsApp ID associated with the scene
   * @param scene - Scene data that was applied
   */
  dispatchSceneApplied: (
    waId: string,
    scene: Record<string, unknown>
  ): void => {
    try {
      window.dispatchEvent(
        new CustomEvent("documents:sceneApplied", {
          detail: { wa_id: waId, scene },
        })
      );
    } catch (_error) {
      // Silently ignore errors when dispatching events
    }
  },
};
