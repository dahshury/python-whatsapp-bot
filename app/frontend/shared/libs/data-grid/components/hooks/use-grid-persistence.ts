import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import type { EditingState } from "../../state/editing-state";
import type { BaseColumnProps } from "../core/types";

const GRID_STATE_KEY = "gridState";
const DEFAULT_PERSISTED_COLUMN_WIDTH = 100; // Default column width when loading persisted state

type GridPersistenceOptions = {
	editingState: EditingState;
	columnsState: GridColumn[];
	setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>;
	hiddenColumns: Set<number>;
	setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>;
	isInitializing: boolean;
};

export function useGridPersistence(options: GridPersistenceOptions) {
	const {
		editingState,
		columnsState,
		setColumns,
		hiddenColumns,
		setHiddenColumns,
		isInitializing,
	} = options;

	const saveState = React.useCallback(() => {
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
				width:
					(col as { width?: number }).width || DEFAULT_PERSISTED_COLUMN_WIDTH,
				isEditable: (col as { isEditable?: boolean }).isEditable ?? true,
				isHidden: hiddenColumns.has(index),
				isPinned: (col as { sticky?: boolean }).sticky ?? false,
				isRequired: (col as { isRequired?: boolean }).isRequired ?? false,
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
	}, [editingState, columnsState, hiddenColumns, isInitializing]);

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
						width:
							(col as { width?: number }).width ||
							DEFAULT_PERSISTED_COLUMN_WIDTH,
						isEditable: (col as { isEditable?: boolean }).isEditable,
						isHidden: false,
						isPinned: (col as { sticky?: boolean }).sticky,
						isRequired: (col as { isRequired?: boolean }).isRequired,
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
