import { useEffect } from "react";
import { toSceneFromDoc } from "@/shared/libs/documents";

type SceneLike = {
	elements?: unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
	editorAppState?: Record<string, unknown>;
} | null;

type UseDocumentsExternalUpdatesArgsSimple = {
	waId: string;
	onScene: (s: SceneLike) => void;
};

type UseDocumentsExternalUpdatesArgs = UseDocumentsExternalUpdatesArgsSimple;

export function useDocumentsExternalUpdates(
	args: UseDocumentsExternalUpdatesArgs
) {
	const waId = args.waId;

	// biome-ignore lint/correctness/useExhaustiveDependencies: Stable refs/handlers; run effect only on waId change
	useEffect(() => {
		// No viewer/top-canvas: no need to preload scene version helpers here

		const onExternal = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					document?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== String(waId)) {
					return;
				}

				const hasDocument =
					detail?.document !== null && detail?.document !== undefined;
				const s = hasDocument
					? (toSceneFromDoc(detail?.document || null) as SceneLike)
					: null;
				// Only show empty state when there's no document at all
				args.onScene(s);
			} catch {
				// Intentional: safely ignore errors when processing external events
			}
		};

		// sceneApplied ignored in simplified flow

		try {
			window.addEventListener(
				"documents:external-update",
				onExternal as unknown as EventListener
			);
		} catch {
			// Intentional: event listener registration may fail in some environments
		}

		return () => {
			try {
				window.removeEventListener(
					"documents:external-update",
					onExternal as unknown as EventListener
				);
			} catch {
				// Intentional: safely ignore errors when removing event listeners
			}
		};
	}, [waId]);
}
