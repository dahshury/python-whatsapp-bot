import type { GridColumn } from "@glideapps/glide-data-grid";
import { useCallback } from "react";
import type { ColumnConfig } from "../types";

type UseColumnReorderingOptions = {
	columns: GridColumn[];
	freezeColumns: number;
	pinColumn: (columnIndex: number) => void;
	unpinColumn: (columnIndex: number) => void;
	columnConfigMapping: Map<string, ColumnConfig>;
};

type UseColumnReorderingResult = {
	onColumnMoved: (startIndex: number, endIndex: number) => void;
};

export const useColumnReordering = ({
	freezeColumns,
	pinColumn,
	unpinColumn,
}: UseColumnReorderingOptions): UseColumnReorderingResult => {
	const onColumnMoved = useCallback(
		(startIndex: number, endIndex: number) => {
			// Don't allow moving columns if it would break pinning logic
			if (startIndex === endIndex) {
				return;
			}

			const isStartPinned = startIndex < freezeColumns;
			const isEndPinned = endIndex < freezeColumns;

			// If moving from pinned to unpinned area, unpin the column
			if (isStartPinned && !isEndPinned) {
				unpinColumn(startIndex);
			} // If moving from unpinned to pinned area, pin the column
			else if (!isStartPinned && isEndPinned) {
				pinColumn(startIndex);
			}
		},
		[freezeColumns, pinColumn, unpinColumn]
	);

	return {
		onColumnMoved,
	};
};
