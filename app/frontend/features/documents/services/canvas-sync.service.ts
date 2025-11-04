/**
 * Service for canvas synchronization logic.
 * Handles camera signature computation and change detection.
 */

// Precision constant for zoom rounding (3 decimal places)
const ZOOM_PRECISION_MULTIPLIER = 1000

export type CameraState = {
	zoom: number
	scrollX: number
	scrollY: number
}

export type AppState = {
	zoom?: { value?: number } | number
	scrollX?: number
	scrollY?: number
	[key: string]: unknown
}

export type CameraSignature = {
	signature: string
	camera: CameraState
}

/**
 * Service for canvas synchronization operations.
 */
export const CanvasSyncService = {
	/**
	 * Computes camera signature from app state.
	 * Rounds values to avoid floating-point precision issues.
	 *
	 * @param appState - App state containing zoom/scroll values
	 * @returns Camera signature and normalized camera state
	 */
	computeCameraSignature(appState: AppState): CameraSignature {
		const zoomValue = (appState.zoom as { value?: number })?.value ?? 1
		const scrollX = (appState.scrollX as number) ?? 0
		const scrollY = (appState.scrollY as number) ?? 0

		const camera: CameraState = {
			zoom:
				Math.round(zoomValue * ZOOM_PRECISION_MULTIPLIER) /
				ZOOM_PRECISION_MULTIPLIER,
			scrollX: Math.round(scrollX),
			scrollY: Math.round(scrollY),
		}

		const signature = JSON.stringify(camera)

		return {
			signature,
			camera,
		}
	},

	/**
	 * Extracts editor camera state from app state.
	 *
	 * @param appState - App state containing camera values
	 * @returns Editor camera state
	 */
	extractEditorCamera(appState: AppState | undefined):
		| {
				zoom: unknown
				scrollX: unknown
				scrollY: unknown
		  }
		| undefined {
		if (!appState) {
			return
		}

		return {
			zoom: appState.zoom,
			scrollX: appState.scrollX,
			scrollY: appState.scrollY,
		}
	},

	/**
	 * Checks if camera signature has changed.
	 *
	 * @param newSignature - New camera signature
	 * @param lastSignature - Last saved camera signature
	 * @returns True if signature changed
	 */
	hasCameraChanged(newSignature: string, lastSignature: string): boolean {
		return newSignature !== lastSignature
	},
}
