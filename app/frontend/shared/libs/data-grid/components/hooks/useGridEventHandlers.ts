import type { GridColumn } from "@glideapps/glide-data-grid";
import {
  CompactSelection,
  type GridSelection,
} from "@glideapps/glide-data-grid";
import React from "react";
import { createDeleteSelectedRows } from "../../core/services/deleteRows";
import { createOnRowAppendedFallback } from "../../core/services/onRowAppendedFallback";
import type { IDataSource } from "../core/interfaces/IDataSource";

type UseGridEventHandlersOptions = {
  columns: GridColumn[];
  gs: {
    setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>;
    selection: GridSelection;
    setSelection: (selection: GridSelection) => void;
    setRowSelection: (selection: CompactSelection) => void;
    setNumRows: (rows: number) => void;
  };
  filteredRows: readonly number[];
  dataProvider: {
    deleteRow: (row: number) => Promise<unknown>;
    refresh: () => Promise<unknown>;
    addRow: () => Promise<unknown>;
    getColumnCount: () => number;
  };
  dataSource: IDataSource;
  getRawCellContent: (col: number, row: number) => unknown;
  saveState: () => void;
  externalDataSource?: IDataSource;
  onAppendRow?: () => void;
};

export function useGridEventHandlers({
  columns,
  gs,
  filteredRows,
  dataProvider,
  dataSource,
  getRawCellContent,
  saveState,
  externalDataSource,
  onAppendRow,
}: UseGridEventHandlersOptions) {
  const handleHide = React.useCallback(
    (columnId: string) => {
      const idx = columns.findIndex((c) => c.id === columnId);
      if (idx >= 0) {
        gs.setHiddenColumns((prev) => new Set([...prev, idx]));
      }
    },
    [columns, gs]
  );

  const clearSelection = React.useCallback(() => {
    gs.setSelection({
      rows: CompactSelection.empty(),
      columns: CompactSelection.empty(),
    });
    gs.setRowSelection(CompactSelection.empty());
  }, [gs]);

  const deleteRows = React.useMemo(
    () =>
      createDeleteSelectedRows({
        selectionRows: gs.selection.rows,
        filteredRows: Array.from(filteredRows),
        dataProvider: {
          deleteRow: async (row: number) => {
            await (
              dataProvider.deleteRow as unknown as (
                r: number
              ) => Promise<unknown>
            )(row);
          },
          refresh: async () => {
            await (dataProvider.refresh as unknown as () => Promise<unknown>)();
          },
        },
        clearSelection,
        saveState,
        externalDataSource,
      }),
    [
      gs.selection.rows,
      filteredRows,
      dataProvider,
      clearSelection,
      saveState,
      externalDataSource,
    ]
  );

  const onRowAppendedHandler = React.useCallback(() => {
    try {
      if (typeof onAppendRow === "function") {
        onAppendRow();
        return true;
      }
    } catch {
      /* ignore append-row user handler error */
    }
    (async () => {
      try {
        const fn = createOnRowAppendedFallback({
          getRowCount: () => dataSource.rowCount,
          getColumnCount: () => dataProvider.getColumnCount(),
          getRawCellContent: (col: number, row: number) =>
            getRawCellContent(col, row),
          addRow: async () => {
            await (dataProvider.addRow as unknown as () => Promise<unknown>)();
          },
          deleteRow: async (row: number) => {
            await (
              dataProvider.deleteRow as unknown as (
                r: number
              ) => Promise<unknown>
            )(row);
          },
          setNumRows: gs.setNumRows,
        });
        await fn();
      } catch {
        /* ignore append-row fallback error */
      }
    })();
    return true;
  }, [onAppendRow, dataSource, dataProvider, getRawCellContent, gs.setNumRows]);

  return {
    handleHide,
    clearSelection,
    deleteRows,
    onRowAppendedHandler,
  };
}
