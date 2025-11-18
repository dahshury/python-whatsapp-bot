import {
	CompactSelection,
	type GridSelection,
} from '@glideapps/glide-data-grid'
import React from 'react'

const initialNumRows = 10

export function useGridState() {
	const [showSearch, setShowSearch] = React.useState(false)
	const [searchValue, setSearchValue] = React.useState('')
	const [selection, setSelection] = React.useState<GridSelection>({
		rows: CompactSelection.empty(),
		columns: CompactSelection.empty(),
	})
	const [rowSelection, setRowSelection] = React.useState<CompactSelection>(
		CompactSelection.empty()
	)
	const [hoverRow, setHoverRow] = React.useState<number | undefined>(undefined)
	const [numRows, setNumRows] = React.useState(initialNumRows)
	const [deletedRows, setDeletedRows] = React.useState<Set<number>>(new Set())
	const [isFocused, setIsFocused] = React.useState<boolean>(false)
	const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
	const [showColumnMenu, setShowColumnMenu] = React.useState<boolean>(false)
	const [hiddenColumns, setHiddenColumns] = React.useState<Set<number>>(
		new Set()
	)

	return {
		showSearch,
		setShowSearch,
		searchValue,
		setSearchValue,
		selection,
		setSelection,
		rowSelection,
		setRowSelection,
		hoverRow,
		setHoverRow,
		numRows,
		setNumRows,
		deletedRows,
		setDeletedRows,
		isFocused,
		setIsFocused,
		isFullscreen,
		setIsFullscreen,
		showColumnMenu,
		setShowColumnMenu,
		hiddenColumns,
		setHiddenColumns,
		initialNumRows,
	}
}
