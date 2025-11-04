import { DEFAULT_EXCALIDRAW_SCENE } from './default-document'

export function stableStringify(value: unknown): string {
	const seen = new WeakSet()
	const replacer = (_key: string, val: unknown) => {
		if (val && typeof val === 'object') {
			if (seen.has(val as object)) {
				return undefined as unknown as never
			}
			seen.add(val as object)
			if (!Array.isArray(val)) {
				return Object.keys(val as Record<string, unknown>)
					.sort()
					.reduce(
						(acc: Record<string, unknown>, k: string) => {
							acc[k] = (val as Record<string, unknown>)[k]
							return acc
						},
						{} as Record<string, unknown>
					)
			}
		}
		return val as unknown as never
	}
	return JSON.stringify(value, replacer)
}

// Hash function constants - using 33 as multiplier (common in hash functions like djb2)
const HASH_MULTIPLIER = 33
const MAX_UINT32 = 0xff_ff_ff_ff
const MAX_INT32 = 0x7f_ff_ff_ff
// Hexadecimal radix for converting hash to string
const HEX_RADIX = 16

function toUint32(value: number): number {
	return Math.floor(Math.abs(value)) % (MAX_UINT32 + 1)
}

function toInt32(value: number): number {
	const abs = Math.floor(Math.abs(value))
	return abs > MAX_INT32 ? MAX_INT32 : abs
}

function combineHash(hash: number, value: number): number {
	// Combine hash using multiplication and XOR equivalent (addition with wrapping)
	const combined = hash * HASH_MULTIPLIER + value
	return toUint32(combined)
}

export function computeSceneSignature(
	elements: unknown[] | null | undefined,
	appState: Record<string, unknown> | null | undefined,
	files: Record<string, unknown> | null | undefined
): string {
	try {
		const els = Array.isArray(elements)
			? (elements as Record<string, unknown>[])
			: []
		let hash = toUint32(els.length)
		for (const el of els) {
			const element = el as Record<string, unknown>
			const v = toInt32(Number((element?.version as unknown) ?? 0))
			const idLen = toInt32(String((element?.id as unknown) ?? '').length)
			hash = combineHash(hash, v)
			hash = combineHash(hash, idLen)
		}
		const filesCount = files
			? Object.keys(files as Record<string, unknown>).length
			: 0
		hash = combineHash(hash, filesCount)
		const bgLen = String(
			(appState as { viewBackgroundColor?: unknown })?.viewBackgroundColor ?? ''
		).length
		hash = combineHash(hash, bgLen)
		const grid = toInt32(
			Number((appState as { gridSize?: unknown })?.gridSize ?? 0)
		)
		hash = combineHash(hash, grid)
		return hash.toString(HEX_RADIX)
	} catch {
		return '0'
	}
}

type NormalizeForPersistOptions = {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
}

export function normalizeForPersist({
	elements,
	appState,
	files,
	viewerAppState,
	editorAppState,
}: NormalizeForPersistOptions): Record<string, unknown> {
	const { collaborators: _dropCollaborators, ...persistableAppState } =
		appState as Record<string, unknown> & {
			collaborators?: unknown
		}
	const result: Record<string, unknown> = {
		elements: elements || [],
		appState: persistableAppState,
		files: files || {},
	}
	// Include viewer camera if provided
	if (viewerAppState) {
		const { collaborators: _dropViewerCollab, ...persistableViewerAppState } =
			viewerAppState as Record<string, unknown> & { collaborators?: unknown }
		result.viewerAppState = persistableViewerAppState
	}
	// Include editor camera if provided (for explicit tracking of editor viewport)
	if (editorAppState) {
		const { collaborators: _dropEditorCollab, ...persistableEditorAppState } =
			editorAppState as Record<string, unknown> & { collaborators?: unknown }
		result.editorAppState = persistableEditorAppState
	}
	return result
}

export function toSceneFromDoc(
	doc: Record<string, unknown> | undefined | null
): {
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
	viewerAppState?: Record<string, unknown>
	editorAppState?: Record<string, unknown>
} {
	const d = doc || DEFAULT_EXCALIDRAW_SCENE
	// If we have saved editorAppState, merge it into appState for proper restoration
	const savedAppState =
		(d as { appState?: Record<string, unknown> })?.appState || {}
	const savedEditorAppState = (
		d as { editorAppState?: Record<string, unknown> }
	)?.editorAppState

	// Merge editor camera back into appState if available
	const mergedAppState = savedEditorAppState
		? { ...savedAppState, ...savedEditorAppState }
		: savedAppState

	const result: {
		elements: unknown[]
		appState: Record<string, unknown>
		files: Record<string, unknown>
		viewerAppState?: Record<string, unknown>
		editorAppState?: Record<string, unknown>
	} = {
		elements: Array.isArray((d as { elements?: unknown[] })?.elements)
			? ((d as { elements?: unknown[] }).elements as unknown[])
			: [],
		appState: (() =>
			({
				...(mergedAppState as Record<string, unknown>),
				collaborators: new Map(),
			}) as Record<string, unknown>)(),
		files: ((d as { files?: Record<string, unknown> })?.files || {}) as Record<
			string,
			unknown
		>,
	}

	// Only add optional properties if they have actual values
	const savedViewerAppState = (
		d as { viewerAppState?: Record<string, unknown> }
	)?.viewerAppState
	if (savedViewerAppState) {
		result.viewerAppState = savedViewerAppState
	}
	if (savedEditorAppState) {
		result.editorAppState = savedEditorAppState
	}

	return result
}
