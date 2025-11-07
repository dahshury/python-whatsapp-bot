import { ValueObject } from "@/shared/domain/value-object";

export type CameraStateProps = {
  zoom: number;
  scrollX: number;
  scrollY: number;
};

/**
 * Value Object representing camera state in the document editor/viewer.
 * Encapsulates zoom level and scroll position with validation and comparison logic.
 *
 * @example
 * ```typescript
 * const camera = CameraState.fromViewerState(viewerAppState)
 * const signature = camera.toSignature()
 * const isEqual = camera.equals(otherCamera)
 * ```
 */
export class CameraState extends ValueObject<CameraStateProps> {
  private static readonly DEFAULT_ZOOM = 1;
  private static readonly ZOOM_PRECISION = 1000;

  protected validate(value: CameraStateProps): void {
    if (value.zoom <= 0) {
      throw new Error("Camera zoom must be greater than 0");
    }
    if (!Number.isFinite(value.zoom)) {
      throw new Error("Camera zoom must be a finite number");
    }
    if (!Number.isFinite(value.scrollX)) {
      throw new Error("Camera scrollX must be a finite number");
    }
    if (!Number.isFinite(value.scrollY)) {
      throw new Error("Camera scrollY must be a finite number");
    }
  }

  /**
   * Creates a camera state with default values (zoom: 1, scroll: 0,0)
   */
  static createDefault(): CameraState {
    return new CameraState({
      zoom: CameraState.DEFAULT_ZOOM,
      scrollX: 0,
      scrollY: 0,
    });
  }

  /**
   * Creates a camera state from viewer/editor state.
   * Normalizes zoom to 3 decimal places and rounds scroll positions.
   *
   * @param viewerState - The app state object
   */
  static fromViewerState(viewerState: Record<string, unknown>): CameraState {
    try {
      const zoomValue =
        (viewerState.zoom as { value?: number })?.value ??
        CameraState.DEFAULT_ZOOM;
      const scrollX = (viewerState.scrollX as number) ?? 0;
      const scrollY = (viewerState.scrollY as number) ?? 0;

      return new CameraState({
        zoom:
          Math.round(zoomValue * CameraState.ZOOM_PRECISION) /
          CameraState.ZOOM_PRECISION,
        scrollX: Math.round(scrollX),
        scrollY: Math.round(scrollY),
      });
    } catch (_error) {
      // Fallback to default on parsing errors
      return CameraState.createDefault();
    }
  }

  /**
   * Converts camera state to a stable string signature for comparison
   */
  toSignature(): string {
    return JSON.stringify(this.value);
  }

  /**
   * Checks equality with another camera state
   * Inherits from ValueObject base class
   */
  equalsCamera(other: CameraState | null): boolean {
    if (!other) {
      return false;
    }
    return this.equals(other);
  }

  // Getters for immutable access
  get zoom(): number {
    return this.value.zoom;
  }

  get scrollX(): number {
    return this.value.scrollX;
  }

  get scrollY(): number {
    return this.value.scrollY;
  }
}
