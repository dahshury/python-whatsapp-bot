import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import { GridDataService, type SortState } from "../services/GridDataService";

interface UseGridDataOperationsProps {
	searchValue: string;
	deletedRows: Set<number>;
	numRows: number;
	displayColumns: GridColumn[];
	visibleColumnIndices: (number | undefined)[];
	getRawCellContent: (col: number, row: number) => any;
}

export const useGridDataOperations = ({
	searchValue,
	deletedRows,
	numRows,
	displayColumns,
	visibleColumnIndices,
	getRawCellContent,
}: UseGridDataOperationsProps) => {
	const [sortState, setSortState] = React.useState<SortState | null>(null);
	const gridDataService = React.useMemo(() => new GridDataService(), []);

	const { filteredRows, filteredRowCount } = React.useMemo(() => {
		return gridDataService.filterAndSortRows(
			searchValue,
			deletedRows,
			numRows,
			displayColumns,
			visibleColumnIndices,
			getRawCellContent,
			sortState,
		);
	}, [
		searchValue,
		deletedRows,
		numRows,
		displayColumns,
		visibleColumnIndices,
		getRawCellContent,
		sortState,
		gridDataService,
	]);

	const tooltipMatrix = React.useMemo(() => {
		return gridDataService.createTooltipMatrix(
			filteredRows,
			displayColumns,
			visibleColumnIndices,
			getRawCellContent,
		);
	}, [
		filteredRows,
		displayColumns,
		visibleColumnIndices,
		getRawCellContent,
		gridDataService,
	]);

	const handleSort = React.useCallback(
		(columnId: string, direction: "asc" | "desc") => {
			setSortState({ columnId, direction });
		},
		[],
	);

	return {
		filteredRows,
		filteredRowCount,
		tooltipMatrix,
		sortState,
		handleSort,
	};
};
