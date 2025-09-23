// Default Excalidraw scene used when a customer document doesn't exist yet.
// You can freely modify this default to fit your needs (elements, appState, files).
// Reference: https://github.com/excalidraw/excalidraw

export const DEFAULT_EXCALIDRAW_SCENE: Record<string, unknown> = {
	elements: [],
	appState: {
		viewBackgroundColor: "#ffffff",
		currentItemStrokeColor: "#1e293b",
		currentItemFillColor: "#ffffff",
		currentItemFontFamily: 1,
		currentItemFontSize: 20,
		currentItemStrokeWidth: 1,
		currentItemOpacity: 100,
		gridSize: null,
	},
	files: {},
};

// Special sentinel used to address the global default document via /api/documents
export const DEFAULT_DOCUMENT_WA_ID = "0000000000000";



