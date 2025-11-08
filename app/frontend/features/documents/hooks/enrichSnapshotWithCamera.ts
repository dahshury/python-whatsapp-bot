/**
 * Enriches a tldraw snapshot with camera position.
 *
 * IMPORTANT: Camera should be applied AFTER loading the snapshot, not embedded in it.
 * This function is currently a pass-through but kept for future enhancements.
 *
 * @param snapshot - The tldraw store snapshot (only document part from backend)
 * @param _camera - Camera position { x, y, z } (not used, applied separately)
 * @returns The snapshot unchanged
 */
export function enrichSnapshotWithCamera(
  snapshot: unknown,
  _camera: { x: number; y: number; z: number } | null | undefined
): unknown {
  // Per tldraw docs, we persist only 'document' (shared state), not 'session' (user-specific).
  // Camera position is part of session state and should be set via editor.setCamera() after load.
  // Attempting to enrich the snapshot with camera causes issues because:
  // 1. Backend only stores document part
  // 2. Session state structure is complex and instance-specific
  // 3. TLDraw expects to initialize session state internally

  // Just return the snapshot unchanged - camera will be set via editor.setCamera()
  return snapshot;
}
