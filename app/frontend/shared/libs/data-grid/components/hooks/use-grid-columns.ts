import { type GridColumn, GridColumnIcon } from "@glideapps/glide-data-grid";
import React from "react";
import { getColumnsForSchema } from "@/shared/libs/data-grid/schemas/registry";
import type {
	IColumnDefinition,
	IDataSource,
} from "../core/interfaces/i-data-source";

// Column grid constants
const DEFAULT_COLUMN_WIDTH = 150; // Default column width in pixels
const COLUMN_NUMBER_OFFSET = 1; // Offset for 1-based column numbering

export function useGridColumns(
	hiddenColumns: Set<number>,
	dataSource?: IDataSource,
	fullWidth?: boolean,
	pinnedColumns: number[] = []
) {
	const [columnsState, setColumnsState] = React.useState<GridColumn[]>([]);

	React.useEffect(() => {
		if (!dataSource) {
			// Fallback via centralized schema registry
			const fallbackDefs = getColumnsForSchema("default");
			const defaultColumns: GridColumn[] = fallbackDefs.map((def) => {
				const icon = getColumnIcon(def);
				return {
					id: def.id,
					title: def.title || def.name,
					width: def.width || DEFAULT_COLUMN_WIDTH,
					...(icon && { icon }),
					isRequired: Boolean(def.isRequired),
					isEditable: def.isEditable !== false,
					hasMenu: true,
					dataType: def.dataType as unknown as string,
				} as GridColumn;
			});
			setColumnsState(defaultColumns);
			return;
		}

		// Use dataSource column definitions
		const columnDefinitions = dataSource.getColumnDefinitions();
		const gridColumns: GridColumn[] = columnDefinitions.map(
			(colDef: IColumnDefinition, index: number) => {
				const icon = getColumnIcon(colDef);
				const themeOverride = (
					colDef as { themeOverride?: Record<string, unknown> }
				).themeOverride;
				return {
					id: colDef.id,
					title:
						colDef.title ||
						colDef.name ||
						`Column ${index + COLUMN_NUMBER_OFFSET}`,
					width: colDef.width || DEFAULT_COLUMN_WIDTH,
					...(icon && { icon }),
					isRequired: colDef.isRequired,
					isEditable: colDef.isEditable !== false,
					hasMenu: true,
					dataType: colDef.dataType,
					...(themeOverride && { themeOverride }),
				};
			}
		);

		setColumnsState(gridColumns);
	}, [dataSource]);

	const visibleColumns = React.useMemo(
		() => columnsState.filter((_, idx) => !hiddenColumns.has(idx)),
		[columnsState, hiddenColumns]
	);

	const visibleColumnIndices = React.useMemo(
		() =>
			visibleColumns
				.map((col) => {
					const idx = columnsState.findIndex((c) => c.id === col.id);
					return idx >= 0 ? idx : undefined;
				})
				.filter((idx): idx is number => idx !== undefined),
		[visibleColumns, columnsState]
	);

	const displayColumns = React.useMemo(() => {
		// Separate pinned and unpinned columns (similar to Streamlit's approach)
		const pinnedCols: GridColumn[] = [];
		const unpinnedCols: GridColumn[] = [];

		visibleColumns.forEach((col, idx) => {
			const originalIndex = visibleColumnIndices[idx];
			if (
				originalIndex !== undefined &&
				pinnedColumns.includes(originalIndex)
			) {
				pinnedCols.push({
					...col,
					hasMenu: true,
					// Pinned columns keep their original width
				} as GridColumn);
			} else {
				// Check if column has been explicitly sized (has grow: 0)
				const originalCol =
					originalIndex !== undefined ? columnsState[originalIndex] : undefined;
				const hasExplicitSize =
					originalCol && "grow" in originalCol && originalCol.grow === 0;

				unpinnedCols.push({
					...col,
					hasMenu: true,
					// Apply stretching behavior to unpinned columns when fullWidth is enabled
					// BUT ONLY if the column hasn't been explicitly sized (resized or autosized)
					...(fullWidth &&
						!hasExplicitSize && {
							grow: 1,
						}),
				} as GridColumn);
			}
		});

		return [...pinnedCols, ...unpinnedCols];
	}, [
		visibleColumns,
		pinnedColumns,
		visibleColumnIndices,
		fullWidth,
		columnsState,
	]);

	const onColumnResize = React.useCallback(
		(column: GridColumn, newSize: number) => {
			setColumnsState((prev) =>
				prev.map((c) =>
					c.id === column.id ? { ...c, width: newSize, grow: 0 } : c
				)
			);
		},
		[]
	);

	const onColumnMoved = React.useCallback(
		(startIndex: number, endIndex: number) => {
			setColumnsState((prev) => {
				const result = [...prev];
				const [removed] = result.splice(startIndex, 1);
				if (removed) {
					result.splice(endIndex, 0, removed);
				}
				return result;
			});
		},
		[]
	);

	const togglePin = React.useCallback((_columnIndex: number) => {
		// Column pinning not yet implemented
	}, []);

	const setColumns = setColumnsState;

	return {
		columns: columnsState,
		columnsState,
		displayColumns,
		visibleColumnIndices,
		onColumnResize,
		setColumns,
		onColumnMoved,
		togglePin,
		pinnedColumns,
	};
}

function getColumnIcon(column: IColumnDefinition): GridColumn["icon"] {
	// Custom icons for specific columns
	if (column.id === "scheduled_time") {
		return "icon-scheduled";
	}
	if (column.id === "phone") {
		return "icon-phone";
	}
	if (column.id === "name") {
		return "icon-name";
	}

	// Fallback to built-in icons based on data type
	switch (column.dataType) {
		case "text":
			return GridColumnIcon.HeaderString;
		case "number":
			return GridColumnIcon.HeaderNumber;
		case "date":
			return GridColumnIcon.HeaderDate;
		case "time":
			return GridColumnIcon.HeaderTime;
		case "dropdown":
			return GridColumnIcon.HeaderArray;
		case "boolean":
			return GridColumnIcon.HeaderBoolean;
		default:
			return GridColumnIcon.HeaderString;
	}
}
