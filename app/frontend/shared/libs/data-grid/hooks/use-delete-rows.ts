import { useCallback } from "react";

type DeleteRowsDeps = {
	gs: {
		selection: { rows: { toArray: () => number[] } };
	};
	filteredRows: number[];
	dataProvider: {
		deleteRow: (row: number) => Promise<boolean>;
		refresh: () => Promise<void>;
	};
	externalDataSource?: unknown;
	saveState: () => void;
	clearSelection: () => void;
};

export function useDeleteRows({
	gs,
	filteredRows,
	dataProvider,
	externalDataSource,
	saveState,
	clearSelection,
}: DeleteRowsDeps) {
	return useCallback(async () => {
		const rowsToDelete = new Set<number>();
		for (const r of gs.selection.rows.toArray()) {
			const actualRow = filteredRows[r];
			if (actualRow !== undefined) {
				rowsToDelete.add(actualRow);
			}
		}
		for (const row of rowsToDelete) {
			await dataProvider.deleteRow(row);
		}
		clearSelection();
		await dataProvider.refresh();
		if (!externalDataSource) {
			saveState();
		}
	}, [
		gs.selection.rows,
		filteredRows,
		dataProvider,
		clearSelection,
		saveState,
		externalDataSource,
	]);
}
