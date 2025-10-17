import { DEFAULT_EXCALIDRAW_SCENE } from "./default-document";

// Attempt to cache Excalidraw's hashElementsVersion for efficient versioning.
// We avoid top-level synchronous imports to keep SSR safe.
let hashElementsVersionRef: null | ((els: readonly unknown[]) => number) = null;
if (typeof window !== "undefined") {
	// Fire-and-forget dynamic import to hydrate the ref when available
	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	import("@excalidraw/excalidraw")
		.then((mod) => {
			const fn = (
				mod as unknown as {
					hashElementsVersion?: (els: readonly unknown[]) => number;
				}
			).hashElementsVersion;
			if (typeof fn === "function") {
				hashElementsVersionRef = fn;
			}
		})
		.catch(() => {
			// Ignore import errors, fall back to lightweight hashing
		});
}

export function stableStringify(value: unknown): string {
	const seen = new WeakSet();
	const replacer = (_key: string, val: unknown) => {
		if (val && typeof val === "object") {
			if (seen.has(val as object)) {
				return undefined as unknown as never;
			}
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
		const els = Array.isArray(elements)
			? (elements as Record<string, unknown>[])
			: [];
		// Prefer Excalidraw's optimized hashing when available
		let version = 0;
		try {
			if (hashElementsVersionRef) {
				version = hashElementsVersionRef(els as unknown as readonly unknown[]);
			} else {
				// Fallback: lightweight deterministic fold over element versions/ids
				const FNV_PRIME = 33;
				let h = els.length;
				// biome-ignore lint/style/useForOf: Index required for hash computation
				for (let i = 0; i < els.length; i++) {
					const el = els[i] as Record<string, unknown>;
					const v = Math.trunc(Number((el?.version as unknown) ?? 0));
					const idLen = String((el?.id as unknown) ?? "").length;
					// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise XOR required for FNV-1a hash
					h = ((h * FNV_PRIME) ^ v) >>> 0;
					// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise XOR required for FNV-1a hash
					h = ((h * FNV_PRIME) ^ idLen) >>> 0;
				}
				// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise right shift required for hash normalization
				version = h >>> 0;
			}
		} catch {
			// Fallback to zero version on error
			version = 0;
		}
		const filesCount = files
			? Object.keys(files as Record<string, unknown>).length
			: 0;
		// Include a couple of relevant appState fields for background/camera changes
		const bgLen = String(
			(appState as { viewBackgroundColor?: unknown })?.viewBackgroundColor ?? ""
		).length;
		const grid = Math.trunc(
			Number((appState as { gridSize?: unknown })?.gridSize ?? 0)
		);
		// Construct a stable composite signature string
		return `${version}|f:${filesCount}|b:${bgLen}|g:${grid}`;
	} catch {
		return "0";
	}
}

export function normalizeForPersist(
	elements: unknown[],
	appState: Record<string, unknown>,
	files: Record<string, unknown>,
	editorAppState?: Record<string, unknown>
): Record<string, unknown> {
	const { collaborators: _dropCollaborators, ...persistableAppState } =
		appState as Record<string, unknown> & {
			collaborators?: unknown;
		};
	const result: Record<string, unknown> = {
		elements: elements || [],
		appState: persistableAppState,
		files: files || {},
	};
	// Include editor camera if provided (for explicit tracking of editor viewport)
	if (editorAppState) {
		const { collaborators: _dropEditorCollab, ...persistableEditorAppState } =
			editorAppState as Record<string, unknown> & { collaborators?: unknown };
		result.editorAppState = persistableEditorAppState;
	}
	return result;
}

export function toSceneFromDoc(
	doc: Record<string, unknown> | undefined | null
): {
	elements: unknown[];
	appState: Record<string, unknown>;
	files: Record<string, unknown>;
	editorAppState?: Record<string, unknown>;
} {
	const d = doc || DEFAULT_EXCALIDRAW_SCENE;
	// If we have saved editorAppState, merge it into appState for proper restoration
	const savedAppState =
		(d as { appState?: Record<string, unknown> })?.appState || {};
	const savedEditorAppState = (
		d as { editorAppState?: Record<string, unknown> }
	)?.editorAppState;

	// Merge editor camera back into appState if available
	const mergedAppState = savedEditorAppState
		? { ...savedAppState, ...savedEditorAppState }
		: savedAppState;

	const result: {
		elements: unknown[];
		appState: Record<string, unknown>;
		files: Record<string, unknown>;
		editorAppState?: Record<string, unknown>;
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
	};

	// Only add optional properties if they have actual values
	if (savedEditorAppState) {
		result.editorAppState = savedEditorAppState;
	}

	return result;
}

export function computeViewerCameraSig(
	viewerState: Record<string, unknown>
): string {
	try {
		// Include zoom and scroll for camera change detection
		const zoomValue = (viewerState.zoom as { value?: number })?.value ?? 1;
		const scrollX = (viewerState.scrollX as number) ?? 0;
		const scrollY = (viewerState.scrollY as number) ?? 0;
		const ZOOM_PRECISION_MULTIPLIER = 1000;
		const z = Math.trunc(Math.round(zoomValue * ZOOM_PRECISION_MULTIPLIER)); // 3 decimals
		const sx = Math.trunc(Math.round(scrollX));
		const sy = Math.trunc(Math.round(scrollY));
		// Simple, stable integer mix of zoom + scroll coordinates
		const FNV_PRIME = 1_000_003;
		const FNV_OFFSET = 1009;
		const FNV_OFFSET_BASIS = 1_274_126_177;
		let h = z * FNV_PRIME + sx * FNV_OFFSET + sy;
		// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise XOR required for FNV-1a hash
		h ^= h >>> 13;
		// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise operations required for 32-bit hash
		h = (h * FNV_OFFSET_BASIS) >>> 0;
		// biome-ignore lint/suspicious/noBitwiseOperators: Bitwise right shift required for hash normalization
		return String(h >>> 0);
	} catch {
		return "";
	}
}
