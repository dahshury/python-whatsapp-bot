export const DEFAULT_DOCUMENT_WA_ID = '' as const

/**
 * Special waId for the template user that holds the default document.
 * This document will be copied to any new user opening their document for the first time.
 * Uses a fixed NANP (US/Canada) phone number: (212) 555-0123
 */
export const TEMPLATE_USER_WA_ID = '12125550123' as const

export const DEFAULT_DOCUMENT_SCENE: {
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
