import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import type { BaseColumnProps } from "../core/types";
import type { EditingState } from "../models/editing-state";

const GRID_STATE_KEY = "gridState";
const DEFAULT_COLUMN_WIDTH = 100;

type UseGridPersistenceOptions = {
  editingState: EditingState;
  columnsState: GridColumn[];
  setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>;
  hiddenColumns: Set<number>;
  setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>;
  isInitializing: boolean;
  options?: { disableSave?: boolean };
};

export function useGridPersistence(params: UseGridPersistenceOptions) {
  const {
    editingState,
    columnsState,
    setColumns,
    hiddenColumns,
    setHiddenColumns,
    isInitializing,
    options,
  } = params;
  const saveState = React.useCallback(() => {
    // Allow opt-out from saving (e.g., when external dataSource controls persistence)
    if (options?.disableSave) {
      return;
    }
    // Don't save during initialization
    if (isInitializing) {
      return;
    }

    // Don't save if columns are not initialized yet
    if (!columnsState || columnsState.length === 0) {
      return;
    }

    // Convert GridColumn[] to BaseColumnProps[] for EditingState
    const baseColumnProps: BaseColumnProps[] = columnsState.map(
      (col, index) => ({
        id: col.id || `col_${index}`,
        name: col.title || col.id || `Column ${index}`,
        title: col.title || `Column ${index}`,
        width: (col as { width?: number }).width || DEFAULT_COLUMN_WIDTH,
        isEditable: Boolean((col as { isEditable?: boolean }).isEditable),
        isHidden: hiddenColumns.has(index),
        isPinned: Boolean((col as { sticky?: boolean }).sticky),
        isRequired: Boolean((col as { isRequired?: boolean }).isRequired),
        isIndex: false,
        indexNumber: index,
        contentAlignment: "left",
        defaultValue: undefined,
        columnTypeOptions: {},
      })
    );

    const state = {
      edits: editingState.toJson(baseColumnProps),
      columns: columnsState,
      columnDefinitions: baseColumnProps,
      hiddenColumns: Array.from(hiddenColumns),
    };
    localStorage.setItem(GRID_STATE_KEY, JSON.stringify(state));
  }, [
    editingState,
    columnsState,
    hiddenColumns,
    isInitializing,
    options?.disableSave,
  ]);

  const loadState = React.useCallback(() => {
    const savedState = localStorage.getItem(GRID_STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);

      // Basic validation – if no columns stored, skip restoring to avoid blank grid
      if (!state.columns || state.columns.length === 0) {
        return;
      }

      // Use stored column definitions if available, otherwise reconstruct from GridColumn
      const baseColumnPropsLoaded: BaseColumnProps[] =
        state.columnDefinitions ||
        (state.columns as GridColumn[]).map(
          (col: GridColumn, index: number) => ({
            id: col.id || `col_${index}`,
            name: col.title || col.id || `Column ${index}`, // Use title as name (this is what EditingState expects)
            title: col.title || `Column ${index}`,
            width: (col as { width?: number }).width || DEFAULT_COLUMN_WIDTH,
            isEditable: Boolean((col as { isEditable?: boolean }).isEditable),
            isHidden: false,
            isPinned: Boolean((col as { sticky?: boolean }).sticky),
            isRequired: Boolean((col as { isRequired?: boolean }).isRequired),
            isIndex: false,
            indexNumber: index,
            contentAlignment: "left",
            defaultValue: undefined,
            columnTypeOptions: {},
          })
        );
      editingState.fromJson(state.edits, baseColumnPropsLoaded);

      // Safeguard: skip applying hidden columns if it would hide everything
      const hiddenCols: number[] = state.hiddenColumns || [];
      if (hiddenCols.length < state.columns.length) {
        setHiddenColumns(new Set(hiddenCols));
      }

      setColumns(state.columns);
    }
  }, [editingState, setColumns, setHiddenColumns]);

  // We can add a button or a useEffect to trigger saveState
  // For now, we will just return the functions
  return { saveState, loadState };
}
