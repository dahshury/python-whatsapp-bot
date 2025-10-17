/*
 * Document events orchestration
 * - Centralizes broadcasting and listening for document-related CustomEvents
 */

export type DocumentScene = Record<string, unknown>;

// Keep a lightweight last-broadcast signature per waId to avoid redundant fan-outs
const __lastBroadcastSigByWaId: Record<string, string> = {};

export function broadcastSceneApplied(
	waId: string,
	scene: DocumentScene,
	sig?: string
): void {
	try {
		if (sig) {
			const last = __lastBroadcastSigByWaId[waId] || "";
			if (last === sig) {
				return;
			}
			__lastBroadcastSigByWaId[waId] = sig;
		}
		window.dispatchEvent(
			new CustomEvent("documents:sceneApplied", {
				detail: { wa_id: waId, scene },
			})
		);
	} catch (_error) {
		// Silently ignore broadcast errors - not critical for document operations
	}
}

export function onExternalDocumentUpdate(
	waId: string,
	handler: (payload: {
		wa_id?: string;
		document?: Record<string, unknown> | null;
		scene?: Record<string, unknown> | null;
	}) => void
): () => void {
	const listener = (e: Event) => {
		try {
			const detail = (e as CustomEvent).detail as {
				wa_id?: string;
				document?: Record<string, unknown> | null;
				scene?: Record<string, unknown> | null;
			};
			if (String(detail?.wa_id || "") !== String(waId)) {
				return;
			}
			handler(detail);
		} catch (_error) {
			// Silently ignore errors processing external document updates
		}
	};
	window.addEventListener(
		"documents:external-update",
		listener as EventListener
	);
	return () =>
		window.removeEventListener(
			"documents:external-update",
			listener as EventListener
		);
}
