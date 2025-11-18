/**
 * Represents the various states of the document save process.
 * Used to provide user feedback about save status.
 */
export type SaveStatus =
	| { status: 'ready' }
	| { status: 'loading' }
	| { status: 'dirty' }
	| { status: 'saving' }
	| { status: 'saved'; at: number }
	| { status: 'error'; message?: string }

/**
 * Payload structure for scene change events.
 * Contains all scene data needed for autosave operations.
 */
export type SceneChangePayload = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
	signature?: string
}
