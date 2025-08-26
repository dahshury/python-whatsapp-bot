import { type GridColumn, GridColumnIcon } from "@glideapps/glide-data-grid";
import React from "react";
import type {
	IColumnDefinition,
	IDataSource,
} from "../core/interfaces/IDataSource";

export function useGridColumns(
	hiddenColumns: Set<number>,
	dataSource?: IDataSource,
	fullWidth?: boolean,
	pinnedColumns: number[] = [],
) {
	const [columnsState, setColumnsState] = React.useState<GridColumn[]>([]);

	React.useEffect(() => {
		if (!dataSource) {
			// Fallback to legacy column definitions
			const defaultColumns: GridColumn[] = [
				{
					id: "name",
					title: "Full Name",
					width: 150,
					icon: GridColumnIcon.HeaderString,
					isRequired: true,
					isEditable: true,
					hasMenu: true,
					dataType: "text",
				} as GridColumn,
				{
					id: "status",
					title: "Status",
					width: 120,
					icon: GridColumnIcon.HeaderArray,
					isRequired: true,
					isEditable: true,
					hasMenu: true,
					dataType: "dropdown",
				} as GridColumn,
				{
					id: "amount",
					title: "Amount",
					width: 100,
					icon: GridColumnIcon.HeaderNumber,
					themeOverride: { textDark: "#009CA6", textLight: "#009CA6" },
					isRequired: true,
					isEditable: true,
					hasMenu: true,
					dataType: "number",
				} as GridColumn,
				{
					id: "date",
					title: "Date",
					width: 120,
					icon: GridColumnIcon.HeaderDate,
					isRequired: true,
					isEditable: true,
					hasMenu: true,
					dataType: "date",
				} as GridColumn,
				{
					id: "time",
					title: "Time",
					width: 120,
					icon: GridColumnIcon.HeaderTime,
					isRequired: true,
					isEditable: true,
					hasMenu: true,
					dataType: "time",
				} as GridColumn,
			];
			setColumnsState(defaultColumns);
			return;
		}

		// Use dataSource column definitions
		const columnDefinitions = dataSource.getColumnDefinitions();
		const gridColumns: GridColumn[] = columnDefinitions.map(
			(colDef: IColumnDefinition, index: number) => ({
				id: colDef.id,
				title: colDef.title || colDef.name || `Column ${index + 1}`,
				width: colDef.width || 150,
				icon: getColumnIcon(colDef),
				isRequired: colDef.isRequired || false,
				isEditable: colDef.isEditable !== false,
				hasMenu: true,
				dataType: colDef.dataType,
				themeOverride: (colDef as { themeOverride?: Record<string, unknown> })
					.themeOverride,
			}),
		);

		setColumnsState(gridColumns);
	}, [dataSource]);

	const visibleColumns = React.useMemo(() => {
		return columnsState.filter((_, idx) => !hiddenColumns.has(idx));
	}, [columnsState, hiddenColumns]);

	const visibleColumnIndices = React.useMemo(() => {
		return visibleColumns
			.map((col) => {
				const idx = columnsState.findIndex((c) => c.id === col.id);
				return idx >= 0 ? idx : undefined;
			})
			.filter((idx): idx is number => idx !== undefined);
	}, [visibleColumns, columnsState]);

	const displayColumns = React.useMemo(() => {
		// Separate pinned and unpinned columns (similar to Streamlit's approach)
		const pinnedCols: GridColumn[] = [];
		const unpinnedCols: GridColumn[] = [];

		visibleColumns.forEach((col, idx) => {
			const originalIndex = visibleColumnIndices[idx];
			if (pinnedColumns.includes(originalIndex)) {
				pinnedCols.push({
					...col,
					hasMenu: true,
					// Pinned columns keep their original width
				} as GridColumn);
			} else {
				// Check if column has been explicitly sized (has grow: 0)
				const originalCol = columnsState[originalIndex];
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
					c.id === column.id ? { ...c, width: newSize, grow: 0 } : c,
				),
			);
		},
		[],
	);

	const onColumnMoved = React.useCallback(
		(startIndex: number, endIndex: number) => {
			setColumnsState((prev) => {
				const result = [...prev];
				const [removed] = result.splice(startIndex, 1);
				result.splice(endIndex, 0, removed);
				return result;
			});
		},
		[],
	);

	const togglePin = React.useCallback((_columnIndex: number) => {
		// This function is kept for backward compatibility but will be replaced
		// by the new column configuration system
		console.warn(
			"togglePin is deprecated, use column configuration system instead",
		);
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

function _getColumnThemeOverride(
	column: IColumnDefinition,
): Record<string, unknown> {
	const overrides: Record<string, unknown> = {};

	// Add specific theme overrides based on column type or metadata
	if (column.dataType === "number" && column.formatting?.type === "currency") {
		overrides.textDark = "#00c896";
	}

	return overrides;
}

function getColumnIcon(column: IColumnDefinition): GridColumnIcon {
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
		case "phone":
			return GridColumnIcon.HeaderPhone;
		case "boolean":
			return GridColumnIcon.HeaderBoolean;
		default:
			return GridColumnIcon.HeaderString;
	}
}
