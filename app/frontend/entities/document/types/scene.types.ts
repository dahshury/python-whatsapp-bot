/**
 * Represents the complete scene data structure from Excalidraw,
 * including optional viewer and editor camera states.
 */
export type DocumentScene = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
}

/**
 * Payload structure for scene change events
 */
export type SceneChangePayload = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
	signature?: string
}

/**
 * Options for scene loading operations
 */
export type SceneLoadOptions = {
	waId: string
	pollIntervalMs?: number
	ignoreChangesDelayMs?: number
}

/**
 * Result of a scene save operation
 */
export type SceneSaveResult = {
	success: boolean
	message?: string
}
