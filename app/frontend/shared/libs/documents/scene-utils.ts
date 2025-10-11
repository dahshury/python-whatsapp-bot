import { DEFAULT_EXCALIDRAW_SCENE } from "./default-document";

export function stableStringify(value: unknown): string {
	const seen = new WeakSet();
	const replacer = (_key: string, val: unknown) => {
		if (val && typeof val === "object") {
			if (seen.has(val as object)) return undefined as unknown as never;
			seen.add(val as object);
			if (!Array.isArray(val)) {
				return Object.keys(val as Record<string, unknown>)
					.sort()
					.reduce(
						(acc: Record<string, unknown>, k: string) => {
							acc[k] = (val as Record<string, unknown>)[k];
							return acc;
						},
						{} as Record<string, unknown>
					);
			}
		}
		return val as unknown as never;
	};
	return JSON.stringify(value, replacer);
}

export function computeSceneSignature(
	elements: unknown[] | null | undefined,
	appState: Record<string, unknown> | null | undefined,
	files: Record<string, unknown> | null | undefined
): string {
	try {
		const els = Array.isArray(elements) ? (elements as Array<Record<string, unknown>>) : [];
		let hash = els.length >>> 0;
		for (let i = 0; i < els.length; i++) {
			const el = els[i] as Record<string, unknown>;
			const v = Number((el?.version as unknown) ?? 0) | 0;
			const idLen = String((el?.id as unknown) ?? "").length | 0;
			hash = ((hash * 33) ^ v) >>> 0;
			hash = ((hash * 33) ^ idLen) >>> 0;
		}
		const filesCount = files ? Object.keys(files as Record<string, unknown>).length : 0;
		hash = ((hash * 33) ^ filesCount) >>> 0;
		const bgLen = String((appState as { viewBackgroundColor?: unknown })?.viewBackgroundColor ?? "").length;
		hash = ((hash * 33) ^ bgLen) >>> 0;
		const grid = Number((appState as { gridSize?: unknown })?.gridSize ?? 0) | 0;
		hash = ((hash * 33) ^ grid) >>> 0;
		return hash.toString(16);
	} catch {
		return "0";
	}
}

export function normalizeForPersist(
	elements: unknown[],
	appState: Record<string, unknown>,
	files: Record<string, unknown>,
	viewerAppState?: Record<string, unknown>,
	editorAppState?: Record<string, unknown>
): Record<string, unknown> {
	const { collaborators: _dropCollaborators, ...persistableAppState } = appState as Record<string, unknown> & {
		collaborators?: unknown;
	};
	const result: Record<string, unknown> = {
		elements: elements || [],
		appState: persistableAppState,
		files: files || {},
	};
	// Include viewer camera if provided
	if (viewerAppState) {
		const { collaborators: _dropViewerCollab, ...persistableViewerAppState } = viewerAppState as Record<
			string,
			unknown
		> & { collaborators?: unknown };
		result.viewerAppState = persistableViewerAppState;
	}
	// Include editor camera if provided (for explicit tracking of editor viewport)
	if (editorAppState) {
		const { collaborators: _dropEditorCollab, ...persistableEditorAppState } = editorAppState as Record<
			string,
			unknown
		> & { collaborators?: unknown };
		result.editorAppState = persistableEditorAppState;
	}
	return result;
}

export function toSceneFromDoc(doc: Record<string, unknown> | undefined | null): {
	elements: unknown[];
	appState: Record<string, unknown>;
	files: Record<string, unknown>;
	viewerAppState?: Record<string, unknown>;
	editorAppState?: Record<string, unknown>;
} {
	const d = doc || DEFAULT_EXCALIDRAW_SCENE;
	// If we have saved editorAppState, merge it into appState for proper restoration
	const savedAppState = (d as { appState?: Record<string, unknown> })?.appState || {};
	const savedEditorAppState = (d as { editorAppState?: Record<string, unknown> })?.editorAppState;

	// Merge editor camera back into appState if available
	const mergedAppState = savedEditorAppState ? { ...savedAppState, ...savedEditorAppState } : savedAppState;

	const result: {
		elements: unknown[];
		appState: Record<string, unknown>;
		files: Record<string, unknown>;
		viewerAppState?: Record<string, unknown>;
		editorAppState?: Record<string, unknown>;
	} = {
		elements: Array.isArray((d as { elements?: unknown[] })?.elements)
			? ((d as { elements?: unknown[] }).elements as unknown[])
			: [],
		appState: (() => {
			return {
				...(mergedAppState as Record<string, unknown>),
				collaborators: new Map(),
			} as Record<string, unknown>;
		})(),
		files: ((d as { files?: Record<string, unknown> })?.files || {}) as Record<string, unknown>,
	};

	// Only add optional properties if they have actual values
	const savedViewerAppState = (d as { viewerAppState?: Record<string, unknown> })?.viewerAppState;
	if (savedViewerAppState) {
		result.viewerAppState = savedViewerAppState;
	}
	if (savedEditorAppState) {
		result.editorAppState = savedEditorAppState;
	}

	return result;
}
