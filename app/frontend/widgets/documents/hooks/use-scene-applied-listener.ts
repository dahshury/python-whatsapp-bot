import { useEffect } from "react";

const SCENE_APPLIED_IGNORE_DELAY_MS = 400;

export function useSceneAppliedListener(args: {
	waId: string;
	initialSceneAppliedRef: { current: boolean };
	ignoreChangesUntilRef: { current: number };
}) {
	const { waId, initialSceneAppliedRef, ignoreChangesUntilRef } = args;

	// biome-ignore lint/correctness/useExhaustiveDependencies: stable refs
	useEffect(() => {
		if (!waId) {
			return;
		}
		const handler = (e: Event) => {
			try {
				const detail = (e as CustomEvent).detail as {
					wa_id?: string;
					scene?: Record<string, unknown> | null;
				};
				if (String(detail?.wa_id || "") !== waId) {
					return;
				}
				initialSceneAppliedRef.current = true;
				ignoreChangesUntilRef.current =
					Date.now() + SCENE_APPLIED_IGNORE_DELAY_MS;
			} catch {
				// Intentional: safely ignore errors when handling scene applied events
			}
		};
		window.addEventListener(
			"documents:sceneApplied",
			handler as unknown as EventListener
		);
		return () =>
			window.removeEventListener(
				"documents:sceneApplied",
				handler as unknown as EventListener
			);
	}, [waId]);
}
