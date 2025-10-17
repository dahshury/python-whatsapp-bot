import type { EditingState } from "@shared/libs/data-grid/state/editing-state";
import { useEffect, useState } from "react";

type ProviderWithEditingState = {
	getEditingState?: () => EditingState;
} | null;

export function useEditingState(
	dataProviderRef: React.RefObject<ProviderWithEditingState>
) {
	const [version, setVersion] = useState(0);
	const [editingState, setEditingState] = useState<EditingState | null>(null);

	useEffect(() => {
		const provider = dataProviderRef.current;
		const state = provider?.getEditingState?.() ?? null;
		setEditingState((prev) => (prev === state ? prev : state));
	}, [dataProviderRef]);

	useEffect(() => {
		if (!editingState) {
			return;
		}
		const unsubscribe = editingState.onChange(() => setVersion((v) => v + 1));
		return () => {
			try {
				unsubscribe?.();
			} catch {
				// Unsubscribe failed; cleanup will continue on unmount
			}
		};
	}, [editingState]);

	return { editingState, version } as const;
}
