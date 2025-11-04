import type { GridCell, GridColumn } from '@glideapps/glide-data-grid'
import React from 'react'
import { GridDataService, type SortState } from '../services/GridDataService'

type UseGridDataOperationsProps = {
	searchValue: string
	deletedRows: Set<number>
	numRows: number
	displayColumns: GridColumn[]
	visibleColumnIndices: (number | undefined)[]
	getRawCellContent: (col: number, row: number) => GridCell
}

export const useGridDataOperations = ({
	searchValue,
	deletedRows,
	numRows,
	displayColumns,
	visibleColumnIndices,
	getRawCellContent,
}: UseGridDataOperationsProps) => {
	const [sortState, setSortState] = React.useState<SortState | null>(null)
	const gridDataService = React.useMemo(() => new GridDataService(), [])

	const { filteredRows, filteredRowCount } = React.useMemo(
		() =>
			gridDataService.filterAndSortRows({
				searchValue,
				deletedRows,
				numRows,
				displayColumns,
				visibleColumnIndices,
				getRawCellContent,
				sortState,
			}),
		[
			searchValue,
			deletedRows,
			numRows,
			displayColumns,
			visibleColumnIndices,
			getRawCellContent,
			sortState,
			gridDataService,
		]
	)

	const tooltipMatrix = React.useMemo(
		() =>
			gridDataService.createTooltipMatrix(
				filteredRows,
				displayColumns,
				visibleColumnIndices,
				getRawCellContent
			),
		[
			filteredRows,
			displayColumns,
			visibleColumnIndices,
			getRawCellContent,
			gridDataService,
		]
	)

	const handleSort = React.useCallback(
		(columnId: string, direction: 'asc' | 'desc') => {
			setSortState({ columnId, direction })
		},
		[]
	)

	return {
		filteredRows,
		filteredRowCount,
		tooltipMatrix,
		sortState,
		handleSort,
	}
}
