import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";
import React from "react";

/** Sort configuration */
export interface SortConfig {
	column: number;
	direction: "asc" | "desc";
}

/**
 * Extract a primitive value used for comparison from a GridCell.
 */
function getSortableValue(cell: GridCell): string | number | Date {
	switch (cell.kind) {
		case GridCellKind.Number:
			return Number((cell as { data?: unknown }).data ?? 0);
		case GridCellKind.Text:
			return String(
				(cell as { displayData?: unknown; data?: unknown }).displayData ??
					(cell as { data?: unknown }).data ??
					"",
			);
		case GridCellKind.Custom:
			// Custom renderers expose copyData / displayData if available
			return String(
				(cell as { copyData?: unknown }).copyData ??
					(cell as { displayData?: unknown }).displayData ??
					(cell as { data?: unknown }).data ??
					"",
			);
		default:
			return String(
				(cell as { displayData?: unknown; data?: unknown }).displayData ??
					(cell as { data?: unknown }).data ??
					"",
			);
	}
}

/**
 * Hook providing row ordering based on a simple column sort toggle (asc / desc / none).
 *
 * @param visibleRows    Current list of row indices after filtering/deletion.
 * @param getRawCell     Function to obtain the cell (unmapped indices) for a given column & row.
 */
export function useGridSort(
	visibleRows: number[],
	getRawCell: (col: number, row: number) => GridCell,
) {
	const [sort, setSort] = React.useState<SortConfig | null>(null);

	const sortedRows = React.useMemo(() => {
		if (!sort) return visibleRows;
		const { column, direction } = sort;

		// Create a copy so we don't mutate original array
		const rowsCopy = [...visibleRows];

		rowsCopy.sort((a, b) => {
			const aVal = getSortableValue(getRawCell(column, a));
			const bVal = getSortableValue(getRawCell(column, b));

			if (aVal === bVal) return 0;
			if (aVal === undefined || aVal === null) return 1;
			if (bVal === undefined || bVal === null) return -1;

			let cmp: number;
			// Handle Date objects separately
			if (aVal instanceof Date && bVal instanceof Date) {
				cmp = aVal.getTime() - bVal.getTime();
			} else if (typeof aVal === "number" && typeof bVal === "number") {
				cmp = aVal - bVal;
			} else {
				cmp = String(aVal).localeCompare(String(bVal));
			}

			return direction === "asc" ? cmp : -cmp;
		});

		return rowsCopy;
	}, [visibleRows, sort, getRawCell]);

	// Toggle sort: asc -> desc -> none
	const toggleSort = React.useCallback((columnIndex: number) => {
		setSort((prev) => {
			if (!prev || prev.column !== columnIndex) {
				return { column: columnIndex, direction: "asc" } as SortConfig;
			}
			if (prev.direction === "asc") {
				return { column: columnIndex, direction: "desc" } as SortConfig;
			}
			return null; // remove sorting
		});
	}, []);

	return {
		sortedRows,
		sortConfig: sort,
		toggleSort,
	} as const;
}
