/*
 * Document events orchestration
 * - Centralizes broadcasting and listening for document-related CustomEvents
 */

export type DocumentScene = Record<string, unknown>;

export function broadcastSceneApplied(waId: string, scene: DocumentScene): void {
	try {
		window.dispatchEvent(
			new CustomEvent("documents:sceneApplied", {
				detail: { wa_id: waId, scene },
			})
		);
	} catch {}
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
			if (String(detail?.wa_id || "") !== String(waId)) return;
			handler(detail);
		} catch {}
	};
	window.addEventListener("documents:external-update", listener as EventListener);
	return () => window.removeEventListener("documents:external-update", listener as EventListener);
}
