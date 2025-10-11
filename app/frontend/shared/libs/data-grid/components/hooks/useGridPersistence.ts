import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import type { BaseColumnProps } from "../core/types";
import type { EditingState } from "../models/EditingState";

const GRID_STATE_KEY = "gridState";

export function useGridPersistence(
	editingState: EditingState,
	columnsState: GridColumn[],
	setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>,
	hiddenColumns: Set<number>,
	setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>,
	isInitializing: boolean
) {
	const saveState = React.useCallback(() => {
		// Don't save during initialization
		if (isInitializing) {
			console.log("Skipping save - still initializing");
			return;
		}

		// Don't save if columns are not initialized yet
		if (!columnsState || columnsState.length === 0) {
			console.log("Skipping save - columns not initialized");
			return;
		}

		// Convert GridColumn[] to BaseColumnProps[] for EditingState
		const baseColumnProps: BaseColumnProps[] = columnsState.map((col, index) => ({
			id: col.id || `col_${index}`,
			name: col.title || col.id || `Column ${index}`,
			title: col.title || `Column ${index}`,
			width: (col as { width?: number }).width || 100,
			isEditable: (col as { isEditable?: boolean }).isEditable || false,
			isHidden: hiddenColumns.has(index),
			isPinned: (col as { sticky?: boolean }).sticky || false,
			isRequired: (col as { isRequired?: boolean }).isRequired || false,
			isIndex: false,
			indexNumber: index,
			contentAlignment: "left",
			defaultValue: undefined,
			columnTypeOptions: {},
		}));

		const state = {
			edits: editingState.toJson(baseColumnProps),
			columns: columnsState,
			columnDefinitions: baseColumnProps,
			hiddenColumns: Array.from(hiddenColumns),
		};
		localStorage.setItem(GRID_STATE_KEY, JSON.stringify(state));
		console.log("Grid state saved:", state);
	}, [editingState, columnsState, hiddenColumns, isInitializing]);

	const loadState = React.useCallback(() => {
		const savedState = localStorage.getItem(GRID_STATE_KEY);
		if (savedState) {
			const state = JSON.parse(savedState);
			console.log("Loading grid state:", state);

			// Basic validation – if no columns stored, skip restoring to avoid blank grid
			if (!state.columns || state.columns.length === 0) {
				return;
			}

			// Use stored column definitions if available, otherwise reconstruct from GridColumn
			const baseColumnPropsLoaded: BaseColumnProps[] =
				state.columnDefinitions ||
				(state.columns as GridColumn[]).map((col: GridColumn, index: number) => ({
					id: col.id || `col_${index}`,
					name: col.title || col.id || `Column ${index}`, // Use title as name (this is what EditingState expects)
					title: col.title || `Column ${index}`,
					width: (col as { width?: number }).width || 100,
					isEditable: (col as { isEditable?: boolean }).isEditable || false,
					isHidden: false,
					isPinned: (col as { sticky?: boolean }).sticky || false,
					isRequired: (col as { isRequired?: boolean }).isRequired || false,
					isIndex: false,
					indexNumber: index,
					contentAlignment: "left",
					defaultValue: undefined,
					columnTypeOptions: {},
				}));
			console.log(
				"Loading columns:",
				baseColumnPropsLoaded.map((c) => ({
					id: c.id,
					name: c.name,
					title: c.title,
				}))
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
