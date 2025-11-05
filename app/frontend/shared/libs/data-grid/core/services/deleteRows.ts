import type { CompactSelection } from "@glideapps/glide-data-grid";

type DeleteSelectedRowsArgs = {
  selectionRows: CompactSelection;
  filteredRows: number[];
  dataProvider: {
    deleteRow: (row: number) => Promise<unknown>;
    refresh: () => Promise<unknown>;
  };
  clearSelection: () => void;
  saveState?: () => void;
  externalDataSource?: unknown;
};

export function createDeleteSelectedRows({
  selectionRows,
  filteredRows,
  dataProvider,
  clearSelection,
  saveState,
  externalDataSource,
}: DeleteSelectedRowsArgs) {
  return async () => {
    const rowsToDelete = new Set<number>();
    for (const r of selectionRows.toArray()) {
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
      saveState?.();
    }
  };
}
