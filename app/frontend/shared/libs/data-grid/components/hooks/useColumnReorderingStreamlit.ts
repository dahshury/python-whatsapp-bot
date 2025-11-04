import type { GridColumn } from '@glideapps/glide-data-grid'
import { useCallback } from 'react'
import type { ColumnConfig } from '../types/column-config-streamlit.types'

type UseColumnReorderingStreamlitOptions = {
	columns: GridColumn[]
	freezeColumns: number
	pinColumn: (columnIndex: number) => void
	unpinColumn: (columnIndex: number) => void
	columnConfigMapping: Map<string, ColumnConfig>
}

// Hook for managing column reordering (similar to Streamlit's useColumnReordering)
export function useColumnReorderingStreamlit(
	options: UseColumnReorderingStreamlitOptions
) {
	const { freezeColumns, pinColumn, unpinColumn } = options
	const onColumnMoved = useCallback(
		(startIndex: number, endIndex: number) => {
			// Don't allow moving columns if it would break pinning logic
			if (startIndex === endIndex) {
				return
			}

			const isStartPinned = startIndex < freezeColumns
			const isEndPinned = endIndex < freezeColumns

			// If moving from pinned to unpinned area, unpin the column
			if (isStartPinned && !isEndPinned) {
				unpinColumn(startIndex)
			}
			// If moving from unpinned to pinned area, pin the column
			else if (!isStartPinned && isEndPinned) {
				pinColumn(startIndex)
			}
		},
		[freezeColumns, pinColumn, unpinColumn]
	)

	return {
		onColumnMoved,
	}
}
