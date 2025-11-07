import { CameraState } from "../value-objects/camera-state.vo";
import { SceneSignature } from "../value-objects/scene-signature.vo";

/**
 * Represents the raw scene data structure
 */
export type SceneElements = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

/**
 * Domain model representing the complete state of a document scene.
 * Encapsulates scene content signature and camera states (viewer + editor).
 * Provides business methods for change detection and state management.
 *
 * @example
 * ```typescript
 * const scene = new SceneState(signature, viewerCamera, editorCamera)
 * scene.updateSignature(newSignature)
 * scene.markSaved()
 * const hasChanges = scene.hasUnsavedChanges()
 * ```
 */
export class SceneState {
  private _signature: SceneSignature;
  private _viewerCamera: CameraState;
  private _editorCamera: CameraState;
  private _lastSavedSignature: SceneSignature | null;
  private _lastSavedViewerCamera: CameraState | null;
  private _lastSavedEditorCamera: CameraState | null;

  constructor(
    signature: SceneSignature,
    viewerCamera: CameraState = CameraState.createDefault(),
    editorCamera: CameraState = CameraState.createDefault()
  ) {
    this._signature = signature;
    this._viewerCamera = viewerCamera;
    this._editorCamera = editorCamera;
    this._lastSavedSignature = null;
    this._lastSavedViewerCamera = null;
    this._lastSavedEditorCamera = null;
  }

  /**
   * Creates a scene state from raw scene elements
   */
  static fromElements(
    elements: SceneElements,
    viewerCamera?: CameraState,
    editorCamera?: CameraState
  ): SceneState {
    const signature = SceneSignature.compute(
      elements.elements,
      elements.appState,
      elements.files
    );
    return new SceneState(
      signature,
      viewerCamera ?? CameraState.createDefault(),
      editorCamera ?? CameraState.createDefault()
    );
  }

  /**
   * Updates the content signature
   */
  updateSignature(signature: SceneSignature): void {
    this._signature = signature;
  }

  /**
   * Updates the viewer camera state
   */
  updateViewerCamera(camera: CameraState): void {
    this._viewerCamera = camera;
  }

  /**
   * Updates the editor camera state
   */
  updateEditorCamera(camera: CameraState): void {
    this._editorCamera = camera;
  }

  /**
   * Marks the current state as saved.
   * Stores current signature and camera states as "last saved" for change detection.
   */
  markSaved(): void {
    this._lastSavedSignature = this._signature;
    this._lastSavedViewerCamera = this._viewerCamera;
    this._lastSavedEditorCamera = this._editorCamera;
  }

  /**
   * Restores saved state (used when external updates arrive)
   */
  restoreSavedState(
    signature: SceneSignature,
    viewerCamera?: CameraState,
    editorCamera?: CameraState
  ): void {
    this._signature = signature;
    this._lastSavedSignature = signature;

    if (viewerCamera) {
      this._viewerCamera = viewerCamera;
      this._lastSavedViewerCamera = viewerCamera;
    }

    if (editorCamera) {
      this._editorCamera = editorCamera;
      this._lastSavedEditorCamera = editorCamera;
    }
  }

  /**
   * Checks if there are unsaved content changes
   */
  hasUnsavedChanges(): boolean {
    return !this._signature.equalsSignature(this._lastSavedSignature);
  }

  /**
   * Checks if viewer camera has changed since last save
   */
  hasViewerCameraChanged(): boolean {
    if (!this._lastSavedViewerCamera) {
      return true;
    }
    return !this._viewerCamera.equalsCamera(this._lastSavedViewerCamera);
  }

  /**
   * Checks if editor camera has changed since last save
   */
  hasEditorCameraChanged(): boolean {
    if (!this._lastSavedEditorCamera) {
      return true;
    }
    return !this._editorCamera.equalsCamera(this._lastSavedEditorCamera);
  }

  /**
   * Checks if any changes (content or camera) exist
   */
  hasAnyChanges(): boolean {
    return (
      this.hasUnsavedChanges() ||
      this.hasViewerCameraChanged() ||
      this.hasEditorCameraChanged()
    );
  }

  /**
   * Computes a combined signature including camera states
   */
  computeCombinedSignature(): SceneSignature {
    const contentSig = this._signature.toString();
    const viewerSig = this._viewerCamera.toSignature();
    const editorSig = this._editorCamera.toSignature();
    const combined = `${contentSig}|viewer:${viewerSig}|editor:${editorSig}`;
    return SceneSignature.fromString(combined);
  }

  // Immutable getters
  get signature(): SceneSignature {
    return this._signature;
  }

  get viewerCamera(): CameraState {
    return this._viewerCamera;
  }

  get editorCamera(): CameraState {
    return this._editorCamera;
  }

  get lastSavedSignature(): SceneSignature | null {
    return this._lastSavedSignature;
  }

  get lastSavedViewerCamera(): CameraState | null {
    return this._lastSavedViewerCamera;
  }

  get lastSavedEditorCamera(): CameraState | null {
    return this._lastSavedEditorCamera;
  }
}
