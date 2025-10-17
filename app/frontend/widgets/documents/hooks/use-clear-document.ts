import { useCallback } from "react";

import type { IDataSource } from "@/shared/libs/data-grid";
import { getDocGridApi } from "@/shared/libs/data-grid/components/utils/grid-api";
import {
	DEFAULT_DOCUMENT_WA_ID,
	toSceneFromDoc,
} from "@/shared/libs/documents";

const IGNORE_PROVIDER_LOAD_DELAY_MS = 500;
const PROVIDER_LOAD_TIMEOUT_MS = 600;

type Column = { id: string };

type ProviderLike = {
	setOnCellDataLoaded?: (cb: (colIdx: number, rowIdx: number) => void) => void;
} | null;

type SceneLike = {
	elements?: unknown[];
	appState?: Record<string, unknown>;
	files?: Record<string, unknown>;
} | null;

const clearEditingState = (providerRef: { current: ProviderLike }): void => {
	try {
		// Provider's setOnCellDataLoaded expects a callback; skip clearing if not available
		if (providerRef.current?.setOnCellDataLoaded) {
			// Provider doesn't support clearing via undefined
		}
	} catch {
		// Intentional: provider may not support callback clearing
	}
};

const clearProviderCache = (
	providerRef: { current: ProviderLike },
	nameCol: number,
	ageCol: number,
	phoneCol: number
): void => {
	try {
		const providerWithInternals = (providerRef.current || null) as unknown as {
			cellCache?: Map<string, unknown>;
			editingState?: { editedCells?: Map<number, Map<number, unknown>> };
		} | null;
		if (providerWithInternals?.editingState?.editedCells) {
			const rowMap = providerWithInternals.editingState.editedCells.get(0);
			rowMap?.delete(nameCol);
			rowMap?.delete(ageCol);
			if (typeof phoneCol === "number" && phoneCol !== -1) {
				rowMap?.delete(phoneCol);
			}
		}
		providerWithInternals?.cellCache?.delete(`${nameCol}-0`);
		providerWithInternals?.cellCache?.delete(`${ageCol}-0`);
		if (typeof phoneCol === "number" && phoneCol !== -1) {
			providerWithInternals?.cellCache?.delete(`${phoneCol}-0`);
		}

		const gridApi = getDocGridApi();
		const cells: { cell: [number, number] }[] = [
			{ cell: [nameCol, 0] as [number, number] },
			{ cell: [ageCol, 0] as [number, number] },
		];
		if (typeof phoneCol === "number" && phoneCol !== -1) {
			cells.push({ cell: [phoneCol, 0] as [number, number] });
		}
		gridApi?.updateCells?.(cells);
	} catch {
		// Intentional: safely ignore errors when clearing provider cache
	}
};

const setProviderLoadGuard = (): void => {
	try {
		(
			globalThis as unknown as { __docIgnoreProviderLoad?: number }
		).__docIgnoreProviderLoad = Date.now() + IGNORE_PROVIDER_LOAD_DELAY_MS;
		setTimeout(() => {
			try {
				const __g = globalThis as unknown as {
					__docIgnoreProviderLoad?: number | undefined;
				};
				__g.__docIgnoreProviderLoad = undefined;
			} catch {
				// Intentional: safely ignore errors when clearing ignore flag
			}
		}, PROVIDER_LOAD_TIMEOUT_MS);
	} catch {
		// Intentional: safely ignore errors when setting provider load guard
	}
};

export function useClearDocument(params: {
	customerColumns: Column[];
	customerDataSource: IDataSource | unknown;
	setWaId: (waId: string) => void;
	setScene: (scene: SceneLike) => void;
	setIsUnlocked: (v: boolean) => void;
	providerRef: { current: ProviderLike };
	pendingInitialLoadWaIdRef: { current: string | null };
}) {
	const {
		customerColumns,
		customerDataSource,
		setWaId,
		setScene,
		setIsUnlocked,
		providerRef,
		pendingInitialLoadWaIdRef,
	} = params;

	return useCallback(async () => {
		try {
			const ds = customerDataSource as IDataSource;
			const nameCol = customerColumns.findIndex((c) => c.id === "name");
			const ageCol = customerColumns.findIndex((c) => c.id === "age");
			const phoneCol = customerColumns.findIndex((c) => c.id === "phone");

			clearEditingState(providerRef);
			await ds.setCellData(nameCol, 0, "");
			await ds.setCellData(ageCol, 0, null);
			await ds.setCellData(phoneCol, 0, "");

			clearProviderCache(providerRef, nameCol, ageCol, phoneCol);
			setProviderLoadGuard();

			// Reset to default document and mark as pending initial load
			pendingInitialLoadWaIdRef.current = DEFAULT_DOCUMENT_WA_ID;

			setWaId(DEFAULT_DOCUMENT_WA_ID);
			setScene(toSceneFromDoc(null));

			setIsUnlocked(false);
		} catch {
			// Intentional: safely ignore errors during document clearing
		}
	}, [
		customerColumns,
		customerDataSource,
		setWaId,
		pendingInitialLoadWaIdRef,
		providerRef,
		setScene,
		setIsUnlocked,
	]);
}
