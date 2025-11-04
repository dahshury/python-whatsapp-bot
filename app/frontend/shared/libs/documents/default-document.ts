export const DEFAULT_DOCUMENT_WA_ID = '' as const

/**
 * Special waId for the template user that holds the default document.
 * This document will be copied to any new user opening their document for the first time.
 */
export const TEMPLATE_USER_WA_ID = '__TEMPLATE__' as const

export const DEFAULT_EXCALIDRAW_SCENE: {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
} = {
	elements: [],
	appState: {
		viewBackgroundColor: '#ffffff',
		gridSize: null,
	},
	files: {},
}
