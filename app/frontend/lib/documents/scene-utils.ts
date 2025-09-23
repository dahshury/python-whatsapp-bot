// Shared utilities for Excalidraw document scenes
// Keep types permissive to avoid coupling with Excalidraw's internal types

import { DEFAULT_EXCALIDRAW_SCENE } from "@/lib/default-document";

export function stableStringify(value: unknown): string {
	const seen = new WeakSet();
	const replacer = (_key: string, val: unknown) => {
		if (val && typeof val === "object") {
			if (seen.has(val)) return undefined as unknown as never;
			seen.add(val);
			if (!Array.isArray(val)) {
				return Object.keys(val as Record<string, unknown>)
					.sort()
					.reduce((acc: Record<string, unknown>, k: string) => {
						acc[k] = (val as Record<string, unknown>)[k];
						return acc;
					}, {} as Record<string, unknown>);
			}
		}
		return val as unknown as never;
	};
	return JSON.stringify(value, replacer);
}

export function computeSceneSignature(
	elements: unknown[] | null | undefined,
	appState: Record<string, unknown> | null | undefined,
	files: Record<string, unknown> | null | undefined,
): string {
	try {
		const els = Array.isArray(elements)
			? (elements as Array<Record<string, unknown>>)
			: [];
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
		const bgLen = String(
			(appState as { viewBackgroundColor?: unknown })?.viewBackgroundColor ?? "",
		).length;
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
): Record<string, unknown> {
	const { collaborators: _dropCollaborators, ...persistableAppState } =
		appState as Record<string, unknown> & { collaborators?: unknown };
	return {
		elements: elements || [],
		appState: persistableAppState,
		files: files || {},
	} as Record<string, unknown>;
}

export function toSceneFromDoc(
	doc: Record<string, unknown> | undefined | null,
): { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } {
	const d = doc || DEFAULT_EXCALIDRAW_SCENE;
	return {
		elements: Array.isArray((d as { elements?: unknown[] })?.elements)
			? ((d as { elements?: unknown[] }).elements as unknown[])
			: [],
		appState: (() => {
			const app = (d as { appState?: Record<string, unknown> })?.appState || {};
			return {
				...(app as Record<string, unknown>),
				collaborators: new Map(),
			} as Record<string, unknown>;
		})(),
		files: ((d as { files?: Record<string, unknown> })?.files || {}) as Record<string, unknown>,
	};
}


